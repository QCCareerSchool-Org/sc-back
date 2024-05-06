import type { Course, Enrollment, NewSubmission, PrismaClient, Tutor } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailService } from '../../services/email/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';
import { submissionIsComplete } from './submissionIsComplete.js';

export type SubmitNewSubmissionRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
};

export type SubmitNewSubmissionResponseDTO = Omit<NewSubmissionDTO, 'complete' | 'points' | 'mark'>;

abstract class SubmitNewSubmissionError extends Error { }
export class SubmitNewSubmissionNotFound extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionEnrollmentOnHold extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionAlreadySubmitted extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionAwaitingAdminComment extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionIncomplete extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionTutorNotAssigned extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionDefaultPriceNotFound extends SubmitNewSubmissionError { }
export class SubmitNewSubmissionMultipleDefaultPricesFound extends SubmitNewSubmissionError { }

export class SubmitNewSubmissionInteractor extends StudentInteractor<SubmitNewSubmissionRequestDTO, SubmitNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly emailService: IEmailService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, submissionId }: SubmitNewSubmissionRequestDTO): Promise<ResultType<SubmitNewSubmissionResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: { student: true },
      });

      this.checkEnrollment(enrollment);

      let updatedSubmission: NewSubmission & { tutor: Tutor | null; enrollment: Enrollment & { course: Course }; parent: NewSubmission | null };

      try {
        updatedSubmission = await this.prisma.$transaction(async transaction => {

          const submission = await this.prisma.newSubmission.findFirst({
            where: {
              enrollment: { studentId, courseId },
              submissionId: submissionIdBin,
            },
            include: {
              tutor: true,
              enrollment: { include: { tutor: true } },
              newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
              prices: true,
            },
          });

          if (!submission) {
            throw new SubmitNewSubmissionNotFound();
          }

          if (submission.enrollment.onHold) {
            throw new SubmitNewSubmissionEnrollmentOnHold();
          }

          if (submission.submitted) {
            throw new SubmitNewSubmissionAlreadySubmitted();
          }

          // see if the tutor has sent this back to the student, but an administrator hasn't reviewed it yet
          if (submission.tutorComment !== null && submission.adminComment === null) {
            throw new SubmitNewSubmissionAwaitingAdminComment();
          }

          if (!submissionIsComplete(submission)) {
            throw new SubmitNewSubmissionIncomplete();
          }

          if (submission.enrollment.tutor === null) {
            throw new SubmitNewSubmissionTutorNotAssigned();
          }
          const tutor = submission.enrollment.tutor;

          // set any existing prices to disabled
          await transaction.newSubmissionPrice.updateMany({
            data: { selected: false },
            where: { submissionId: submissionIdBin },
          });

          // set one price to enabled
          const countryPrice = submission.prices.find(p => p.countryId === tutor.countryId);
          if (countryPrice) {
            await transaction.newSubmissionPrice.update({
              data: { selected: true },
              where: { submissionPriceId: countryPrice.submissionPriceId },
            });
          } else {
            const result = await transaction.newSubmissionPrice.updateMany({
              data: { selected: true },
              where: { submissionId: submissionIdBin, countryId: null },
            });
            if (result.count < 1) {
              this.logger.error(`No default price found for ${submissionId}`);
              throw new SubmitNewSubmissionDefaultPriceNotFound();
            }
            if (result.count > 1) {
              this.logger.error(`Multiple default prices found for ${submissionId}`);
              throw new SubmitNewSubmissionMultipleDefaultPricesFound();
            }
          }

          const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

          // update submission and return the updated submission
          return transaction.newSubmission.update({
            data: {
              submitted: prismaNow,
              skipped: false,
              tutorId: tutor.tutorId,
              tutorComment: null,
              adminComment: null,
              modified: prismaNow,
            },
            where: { submissionId: submissionIdBin },
            include: { tutor: true, enrollment: { include: { course: true } }, parent: true },
          });
        });
      } catch (err) {
        if (err instanceof SubmitNewSubmissionError) {
          return Result.fail(err);
        }
        throw err;
      }

      if (!updatedSubmission.skipped) {
        if (updatedSubmission.tutor) { // this should always be set
          const tutor = updatedSubmission.tutor;
          if (tutor.emailAddress === null) {
            this.logger.warn('Tutor has no email address');
          } else {
            try {
              await this.emailTutor(
                tutor.emailAddress,
                tutor.firstName,
                tutor.lastName,
                updatedSubmission.enrollment.studentId,
                updatedSubmission.enrollment.courseId,
                submissionId,
                updatedSubmission.enrollment.course.code,
                updatedSubmission.enrollment.studentNumber,
                updatedSubmission.unitLetter
              );
            } catch (e) {
              this.logger.warn('Error emailing tutor', e);
            }
          }
        } else {
          this.logger.warn('Tutor was not set');
        }
      }

      return Result.success({
        submissionId: this.uuidService.binToUUID(updatedSubmission.submissionId),
        enrollmentId: updatedSubmission.enrollmentId,
        tutorId: updatedSubmission.tutorId,
        unitLetter: updatedSubmission.unitLetter,
        title: updatedSubmission.title,
        description: updatedSubmission.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: updatedSubmission.optional,
        order: updatedSubmission.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: updatedSubmission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(updatedSubmission.submitted),
        transferred: this.dateService.fixPrismaReadDate(updatedSubmission.transferred),
        closed: this.dateService.fixPrismaReadDate(updatedSubmission.closed),
        skipped: updatedSubmission.skipped,
        responseFilename: updatedSubmission.responseFilename === null ? null : `${updatedSubmission.enrollment.course.code}${updatedSubmission.enrollment.enrollmentId} Submission ${updatedSubmission.unitLetter}.mp3`,
        responseFilesize: updatedSubmission.responseFilesize,
        responseMimeTypeId: updatedSubmission.responseMimeTypeId,
        responseProgress: updatedSubmission.responseProgress,
        redoId: updatedSubmission.redoId === null ? null : this.uuidService.binToUUID(updatedSubmission.redoId),
        hasParent: updatedSubmission.parent !== null,
        created: this.dateService.fixPrismaReadDate(updatedSubmission.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubmission.modified),
      });

    } catch (err) {
      this.logger.error('error submitting new submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async emailTutor(emailAddress: string, firstName: string, lastName: string, studentId: number, courseId: number, submissionId: string, courseCode: string, studentNumber: number, unitLetter: string): Promise<void> {
    const url = `https://studentcenter.qccareerschool.com/sc/tutors/students/${studentId}/courses/${courseId}/submissions/${encodeURIComponent(submissionId)}`;

    const htmlBody = `<p>Dear ${firstName},</p>
<p>You have a <a href="${url}">new unit ready for marking</a>.</p>
<p>Student: ${courseCode}${studentNumber}<br />Unit: ${unitLetter}</p>`;

    const textBody = `Dear ${firstName},

You have a new unit ready for marking (${url}).

Student: ${courseCode}${studentNumber}
Unit: ${unitLetter}`;

    const name = firstName + ' ' + lastName;
    await this.emailService.send(name, emailAddress, 'Unit Ready for Marking', htmlBody, textBody);
  }
}
