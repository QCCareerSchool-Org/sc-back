import type { Course, Enrollment, NewSubmission, PrismaClient, Student } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailService } from '../../services/email/index.js';
import type { IGradeService } from '../../services/grade/index.js';
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
          enrollment: { include: { student: true, course: true } },
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

      if (newSubmission.enrollment.student.emailAddress) {
        const studentName = `${newSubmission.enrollment.student.firstName} ${newSubmission.enrollment.student.lastName}`;
        try {
          await this.sendStudentEmail(studentName, newSubmission.enrollment.student.emailAddress, newSubmission.enrollment.course.name, newSubmission.unitLetter);
        } catch (err) {
          this.logger.error('Error student email', err);
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

  private async sendStudentEmail(name: string, to: string, courseName: string, unitLetter: string): Promise<void> {
    const subject = 'Unit Has Been Marked';
    const textBody = `${name},\n\nYour ${courseName} submission ${unitLetter} has been marked. You may now review your marks and your tutor's audio feedback at the Online Student Center (https://studentcenter.qccareerschool.com).`;
    const htmlBody = `<p>${name},</p><p>Your ${courseName} submission ${this.sanitizerService.sanitizeHtml(unitLetter)} has been marked. You may now review your marks and your tutor's audio feedback at the <a href="https://studentcenter.qccareerschool.com">Online Student Center</a>.</p>`;

    await this.emailService.send(name, to, subject, htmlBody, textBody);
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
}
