import type { Course, Enrollment, NewSubmission, PrismaClient, Student } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailService } from '../../services/email/index.js';
import type { Grade, IGradeService } from '../../services/grade/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type CloseNewSubmissionRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
};

export type CloseNewSubmissionResponseDTO = NewSubmissionDTO;

export class CloseNewSubmissionNotFound extends Error { }
export class CloseNewSubmissionNotSubmitted extends Error { }
export class CloseNewSubmissionSkipped extends Error { }
export class CloseNewSubmissionAlreadyClosed extends Error { }
export class CloseNewSubmissionWrongTutor extends Error { }
export class CloseNewSubmissionAlreadyReturned extends Error { }
export class CloseNewSubmissionNoFeedback extends Error { }
export class CloseNewSubmissionNotMarked extends Error { }

export class CloseNewSubmissionInteractor implements IInteractor<CloseNewSubmissionRequestDTO, CloseNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly emailService: IEmailService,
    private readonly gradeService: IGradeService,
    private readonly sanitizerService: ISanitizerService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId }: CloseNewSubmissionRequestDTO): Promise<ResultType<CloseNewSubmissionResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const newSubmission = await this.prisma.newSubmission.findFirst({
        where: { submissionId: submissionIdBin, enrollment: { studentId } },
        include: {
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
          enrollment: { include: { student: true, course: { include: { school: true } } } },
        },
      });

      if (!newSubmission) {
        return Result.fail(new CloseNewSubmissionNotFound());
      }

      if (!newSubmission.submitted) {
        return Result.fail(new CloseNewSubmissionNotSubmitted());
      }

      if (newSubmission.skipped) {
        return Result.fail(new CloseNewSubmissionSkipped());
      }

      if (newSubmission.closed) {
        return Result.fail(new CloseNewSubmissionAlreadyClosed());
      }

      if (newSubmission.tutorId !== tutorId) {
        return Result.fail(new CloseNewSubmissionWrongTutor());
      }

      if (newSubmission.tutorComment) {
        return Result.fail(new CloseNewSubmissionAlreadyReturned());
      }

      if (newSubmission.responseFilename === null) {
        return Result.fail(new CloseNewSubmissionNoFeedback());
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;

      for (const a of newSubmission.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        for (const p of a.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          for (const t of p.newTextBoxes) {
            const textBoxComplete = t.text.length > 0;
            if (!textBoxComplete && !t.optional) {
              partComplete = false;
            }
            if (textBoxComplete && t.mark === null && t.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (textBoxComplete || !t.optional) {
              partPoints += t.points;
              partMark += t.mark ?? 0;
            }
          }
          for (const u of p.newUploadSlots) {
            const uploadSlotComplete = u.filename !== null;
            if (!uploadSlotComplete && !u.optional) {
              partComplete = false;
            }
            if (uploadSlotComplete && u.mark === null && u.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (uploadSlotComplete || !u.optional) {
              partPoints += u.points;
              partMark += u.mark ?? 0;
            }
          }
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
        }
        if (!assignmentComplete && !a.optional) {
          submissionComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          submissionMarked = false;
        }
        // ignore incomplete, optional assignments
        if (assignmentComplete || !a.optional) {
          submissionPoints += assignmentPoints;
          submissionMark += assignmentMark;
        }
      }

      if (!submissionMarked) {
        return Result.fail(new CloseNewSubmissionNotMarked());
      }

      const failed = submissionPoints > 0 && submissionMark / submissionPoints < 0.5;
      this.logger.info('Submission closed', { newSubmission, submissionPoints, submissionMark, failed });

      const finalUnitLetter = await this.getFinalUnitLetter(newSubmission.enrollment.courseId);

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedSubmission = await this.prisma.$transaction(async t => {
        const s = await t.newSubmission.update({
          data: {
            closed: prismaNow,
            modified: prismaNow,
          },
          where: { submissionId: submissionIdBin },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } }, parent: true },
        });

        if (failed) {
          await t.enrollment.update({
            data: { onHold: true, holdReason: 'failed unit' },
            where: { enrollmentId: s.enrollmentId },
          });

          try {
            await this.sendFailedEmail(newSubmission.enrollment.course.code, newSubmission.enrollment.studentNumber, newSubmission.unitLetter);
          } catch (err) {
            this.logger.warn('Could not send failed submission email', err);
          }
        }

        if (newSubmission.unitLetter !== finalUnitLetter) { // this is not the final submission
          return s;
        }

        // check if there is already a final submission recorded
        const finalSubmission = await t.finalSubmission.findFirst({ where: { enrollmentId: s.enrollmentId } });

        if (finalSubmission) { // we already have a final submission recorded for this enrollment
          return s;
        }

        // create the final submission record
        await t.finalSubmission.create({
          data: {
            enrollmentId: s.enrollmentId,
            created: prismaNow,
          },
        });

        return s;
      });

      if (this.shouldSendDGKit(newSubmission, submissionPoints, submissionMark)) {
        try {
          await this.sendDGKitShippingEmail(newSubmission);
        } catch (err) {
          this.logger.error('Error sending DG kit email', err);
        }
      }

      if (this.shouldSendMZKit(newSubmission, submissionPoints, submissionMark)) {
        try {
          await this.sendMakeupKitShippingEmail(newSubmission);
        } catch (err) {
          this.logger.error('Error sending MZ kit email', err);
        }
      }

      if (this.shouldSendHSKit(newSubmission, submissionPoints, submissionMark)) {
        try {
          await this.sendMakeupKitShippingEmail(newSubmission);
        } catch (err) {
          this.logger.error('Error sending HS kit email', err);
        }
      }

      submissionComplete = true;
      submissionMarked = true;
      submissionPoints = 0;
      submissionMark = 0;

      for (const a of updatedSubmission.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        for (const p of a.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          for (const t of p.newTextBoxes) {
            const textBoxComplete = t.text.length > 0;
            if (!textBoxComplete && !t.optional) {
              partComplete = false;
            }
            if (textBoxComplete && t.mark === null && t.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (textBoxComplete || !t.optional) {
              partPoints += t.points;
              partMark += t.mark ?? 0;
            }
          }
          for (const u of p.newUploadSlots) {
            const uploadSlotComplete = u.filename !== null;
            if (!uploadSlotComplete && !u.optional) {
              partComplete = false;
            }
            if (uploadSlotComplete && u.mark === null && u.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (uploadSlotComplete || !u.optional) {
              partPoints += u.points;
              partMark += u.mark ?? 0;
            }
          }
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
        }
        if (!assignmentComplete && !a.optional) {
          submissionComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          submissionMarked = false;
        }
        // ignore incomplete, optional assignments
        if (assignmentComplete || !a.optional) {
          submissionPoints += assignmentPoints;
          submissionMark += assignmentMark;
        }
      }

      if (newSubmission.enrollment.student.emailAddress) {
        const studentName = `${newSubmission.enrollment.student.firstName} ${newSubmission.enrollment.student.lastName}`;
        const grade = this.gradeService.calculate(submissionMark / submissionPoints);
        try {
          await this.sendStudentEmail(
            studentName,
            newSubmission.enrollment.student.emailAddress,
            newSubmission.enrollment.course.school.name,
            newSubmission.enrollment.course.name,
            newSubmission.unitLetter,
            grade,
            failed
          );
        } catch (err) {
          this.logger.error('Error student email', err);
        }

        const allowedGrades: Grade[] = [ 'A-', 'A', 'A+' ];
        const schoolName = newSubmission.enrollment.course.school.name;
        if (this.allowedSchool(schoolName) && submissionPoints > 0 && allowedGrades.includes(grade)) {
          await this.sendAwardOfExcellenceEmail(studentName, newSubmission.enrollment.student.emailAddress, grade, newSubmission.enrollment.course.name, schoolName, submissionId);
        }
      }

      return Result.success({
        submissionId: this.uuidService.binToUUID(updatedSubmission.submissionId),
        enrollmentId: updatedSubmission.enrollmentId,
        tutorId: updatedSubmission.tutorId,
        unitLetter: updatedSubmission.unitLetter,
        title: updatedSubmission.title,
        description: updatedSubmission.description,
        markingCriteria: updatedSubmission.markingCriteria,
        optional: updatedSubmission.optional,
        order: updatedSubmission.order,
        tutorComment: updatedSubmission.tutorComment,
        adminComment: updatedSubmission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(updatedSubmission.submitted),
        transferred: this.dateService.fixPrismaReadDate(updatedSubmission.transferred),
        closed: this.dateService.fixPrismaReadDate(updatedSubmission.closed),
        skipped: updatedSubmission.skipped,
        responseFilename: updatedSubmission.responseFilename,
        responseFilesize: updatedSubmission.responseFilesize,
        responseMimeTypeId: updatedSubmission.responseMimeTypeId,
        responseProgress: updatedSubmission.responseProgress,
        redoId: updatedSubmission.redoId === null ? null : this.uuidService.binToUUID(updatedSubmission.redoId),
        hasParent: updatedSubmission.parent !== null,
        created: this.dateService.fixPrismaReadDate(updatedSubmission.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubmission.modified),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submissionMarked ? submissionMark : null,
      });

    } catch (err) {
      this.logger.error('error closing new submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private shouldSendDGKit(submission: NewSubmission & { enrollment: { studentNumber: number; course: Course } }, points: number, mark: number): boolean {
    return submission.enrollment.course.code === 'DG' && submission.unitLetter === 'B' && (points === 0 || this.gradeService.calculate(mark / points) !== 'F');
  }

  private shouldSendMZKit(submission: NewSubmission & { enrollment: { studentNumber: number; course: Course } }, points: number, mark: number): boolean {
    return submission.enrollment.studentNumber <= 143347 && submission.enrollment.course.code === 'MZ' && submission.unitLetter === 'A' && (points === 0 || this.gradeService.calculate(mark / points) !== 'F');
  }

  private shouldSendHSKit(submission: NewSubmission & { enrollment: { studentNumber: number; course: Course } }, points: number, mark: number): boolean {
    return submission.enrollment.studentNumber <= 143347 && submission.enrollment.course.code === 'HS' && submission.unitLetter === 'A' && (points === 0 || this.gradeService.calculate(mark / points) !== 'F');
  }

  private async sendDGKitShippingEmail(submission: NewSubmission & { enrollment: Enrollment & { student: Student; course: Course } }): Promise<void> {
    const name = 'Shipping Department';
    const to = 'shipping@qccareerschool.com';
    const subject = `${submission.enrollment.course.code}${submission.enrollment.studentNumber} Submission ${submission.unitLetter} Has Been Marked`;
    const textBody = `${submission.enrollment.student.firstName} ${submission.enrollment.student.lastName} (${submission.enrollment.course.code}${submission.enrollment.studentNumber})'s Submission ${submission.unitLetter} has been marked. Please ship clippers and combs if they haven't already been sent (check student notes).`;
    const htmlBody = `<p>${textBody}</p>`;

    await this.emailService.send(name, to, subject, htmlBody, textBody);
  }

  private async sendMakeupKitShippingEmail(submission: NewSubmission & { enrollment: Enrollment & { student: Student; course: Course } }): Promise<void> {
    const name = 'Shipping Department';
    const to = 'shipping@qccareerschool.com';
    const body = [ `${submission.enrollment.student.firstName} ${submission.enrollment.student.lastName} (${submission.enrollment.course.code}${submission.enrollment.studentNumber})'s Submission ${submission.unitLetter} has been marked. Please ship all applicable kits for _any_ makeup courses that haven't already been shipped.`, 'Please check the student file to verify which kits the student should receive.' ];
    const subject = `${submission.enrollment.course.code}${submission.enrollment.studentNumber} Submission ${submission.unitLetter} Has Been Marked`;
    const textBody = body.join('\n\n');
    const htmlBody = body.map(b => `<p>${b}</p>`).join('\n');

    await this.emailService.send(name, to, subject, htmlBody, textBody);
  }

  private async sendStudentEmail(fullName: string, to: string, schoolName: string, courseName: string, unitLetter: string, grade: string, failed: boolean): Promise<void> {
    const subject = 'Your Submission Has Been Marked';
    let textBody: string;
    let htmlBody: string;

    if (failed) {
      textBody = `Your ${courseName} submission for Unit ${unitLetter} has been marked. You can now review your marks and your tutor's audio feedback in the Online Student Center (https://studentcenter.qccareerschool.com).\n\nUnfortunately, your submission didn't meet the required criteria, and you will need to resubmit in order to move forward. Please know that this is just a small setback. Many students face challenges along the way, and we are here to help you succeed!\n\nWe recommend reaching out to our Teaching Assistant Team at teachingassistant@qccareerschool.com. They will assist with the steps you'll need to take to resubmit your unit. They can also help you with any questions you may have about the feedback, clarify anything you don't understand, or even set up a call to walk you through areas that need improvement. They're here to offer personalized guidance and support as you work toward successfully completing this unit.\n\nKeep pushing forward—you've got this! We're confident that with a little extra support, you'll complete this unit successfully and continue making great progress in your studies.`;
      htmlBody = `<p>Your ${courseName} submission for Unit ${unitLetter} has been marked. You can now review your marks and your tutor's audio feedback in the <a href="https://studentcenter.qccareerschool.com">Online Student Center</a>.</p><p>Unfortunately, your submission didn't meet the required criteria, and you will need to resubmit in order to move forward. Please know that this is just a small setback. Many students face challenges along the way, and we are here to help you succeed!</p><p>We recommend reaching out to our Teaching Assistant Team at <a href="mailto:teachingassistant@qccareerschool.com">teachingassistant@qccareerschool.com</a>. They will assist with the steps you'll need to take to resubmit your unit. They can also help you with any questions you may have about the feedback, clarify anything you don't understand, or even set up a call to walk you through areas that need improvement. They're here to offer personalized guidance and support as you work toward successfully completing this unit.</p><p>Keep pushing forward—you've got this! We're confident that with a little extra support, you'll complete this unit successfully and continue making great progress in your studies.</p>`;

    } else {
      textBody = `*Your Submission ${unitLetter} has been reviewed and you received a grade of ${grade}.${[ 'B-', 'B', 'B+', 'A-', 'A', 'A+' ].includes(grade) ? ' Congratulations!' : ''}*\n\n`;
      htmlBody = `<h4>Your Submission ${unitLetter} has been reviewed and you received a grade of ${grade}.${[ 'B-', 'B', 'B+', 'A-', 'A', 'A+' ].includes(grade) ? ' Congratulations!' : ''}</h4>`;

      textBody += `You can now listen to your tutor's audio feedback in the Online Student Center (https://studentcenter.qccareerschool.com). We hope it helps you grow and improve as you move forward in your course.\n\n`;
      htmlBody += `<p>You can now listen to your tutor's audio feedback in the <a href="https://studentcenter.qccareerschool.com">Online Student Center</a>. We hope it helps you grow and improve as you move forward in your course.</p>`;

      const reviewUrl = this.getReviewUrl(schoolName);
      if ([ 'B+', 'A-', 'A', 'A+' ].includes(grade) && reviewUrl) {
        textBody += `*We'd love to hear how your course is going!*\n\nIf you have a moment, please consider sharing your experience by leaving us a review on Google (${reviewUrl}). Your feedback means a lot to us and helps others make informed decisions!`;
        htmlBody += `<h4>We'd love to hear how your course is going!</h4><p>If you have a moment, please consider sharing your experience <a href="${reviewUrl}">by leaving us a review on Google</a>. Your feedback means a lot to us and helps others make informed decisions!`;
      }
    }

    await this.emailService.send(fullName, to, subject, htmlBody, textBody, undefined, { bcc: 'dave@qccareerschool.com' });
  }

  private async sendFailedEmail(courseCode: string, studentNumber: number, unitLetter: string): Promise<void> {
    const name = 'TA';
    const to = 'teachingassistant@qccareerschool.com';
    const subject = 'Failed Submission';
    const htmlBody = `<p>${this.sanitizerService.sanitizeHtml(courseCode)}${studentNumber} has failed submission ${this.sanitizerService.sanitizeHtml(unitLetter)}</p>`;
    const textBody = `${courseCode}${studentNumber} has failed submission ${unitLetter}\n\n`;
    await this.emailService.send(name, to, subject, htmlBody, textBody);
  }

  private async getFinalUnitLetter(courseId: number): Promise<string | null> {
    const template = await this.prisma.newSubmissionTemplate.findFirst({ where: { courseId }, orderBy: [ { order: 'desc' }, { unitLetter: 'desc' } ] });
    return template?.unitLetter ?? null;
  }

  private async sendAwardOfExcellenceEmail(name: string, to: string, grade: string, courseName: string, schoolName: string, submissionId: string): Promise<void> {
    const url = this.getAwardUrl(schoolName, submissionId);
    const subject = 'Your Award of Excellence is Ready to Share 🏅';
    const htmlBody = `
<div style="max-width: 720px; margin: 2rem auto;">
<h1>You did it!</h1>
<p>You've received an Award of Excellence for your outstanding achievement in ${courseName} with a final grade of ${grade}!</p>
<p>Click below to view your personalized digital badge and share your success with the world 🌟</p>
<p>👉 <a href="${url}"><button>View My Badge</button></a></p>
<p>Keep aiming high—we're proud to have you in the ${schoolName} community!</p>
<p>This achievement reflects your dedication and hard work, and we encourage you to share your success with your peers—you've absolutely earned it!</p>
<p>All the best,</p>
<p>Your Team at QC</p>
<p>P.S. We'd love to share your story to inspire others! Just reply to this email if you'd like to be featured.</p>
</div>
`;
    const txtBody = `
*You did it!*

You've received an Award of Excellence for your outstanding achievement in ${courseName} with a final grade of ${grade}!

Click below to view your personalized digital badge and share your success with the world 🌟

👉 View My Badge (${url})

Keep aiming high—we're proud to have you in the ${schoolName} community!

This achievement reflects your dedication and hard work, and we encourage you to share your success with your peers—you've absolutely earned it!

All the best,

Your Team at QC

P.S. We'd love to share your story to inspire others! Just reply to this email if you'd like to be featured.
`;
    await this.emailService.send(name, to, subject, htmlBody, txtBody, undefined, { 'reply-to': 'info@qccareerschool.com' });
  }

  private getAwardUrl(schoolName: string, submissionId: string): string {
    switch (schoolName) {
      case 'QC Design School':
        return `https://www.qcdesignschool.com/awards/${submissionId}`;
      case 'QC Event School':
        return `https://www.qceventplanning.com/awards/${submissionId}`;
      case 'QC Makeup Academy':
        return `https://www.qcmakeupacademy.com/award-of-excellence?submissionId=${submissionId}`;
      case 'QC Pet Studies':
        return `https://www.qcpetstudies.com/awards/${submissionId}`;
      case 'QC Wellness Studies':
        return `https://www.qcwellnessstudies.com/awards/${submissionId}`;
    }
    return 'https://www.qccareerschool.com';
  }

  private allowedSchool(schoolName: string): boolean {
    return [ 'QC Design School', 'QC Event School', 'QC Makeup Academy', 'QC Pet Studies' ].includes(schoolName);
  }

  private getReviewUrl(schoolName: string): string | undefined {
    switch (schoolName) {
      case 'QC Design School':
        return 'https://g.page/r/CSBpJ7EUV5BlEAE/review';
      case 'QC Event School':
        return 'https://g.page/r/CYFHXcguiSvZEBM/review';
      case 'QC Makeup Academy':
        return 'https://g.page/r/CUjPhFM_xCePEBM/review';
      case 'QC Pet Studies':
        return 'https://g.page/r/CecVjVSoL9bwEBM/review';
    }
  }
}
