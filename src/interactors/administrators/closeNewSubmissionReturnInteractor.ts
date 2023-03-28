import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/administrators/newSubmissionDTO.js';
import type { NewSubmissionReturnDTO } from '../../domain/newSubmissionReturnDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailService } from '../../services/email/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type CloseNewSubmissionReturnRequestDTO = {
  submissionReturnId: string;
  adminComment: string;
};

export type CloseNewSubmissionReturnResponseDTO = NewSubmissionReturnDTO & {
  newSubmission: Omit<NewSubmissionDTO, 'points' | 'mark' | 'markOverride' | 'complete'>;
};

export class CloseNewSubmissionReturnNotFound extends Error { }
export class CloseNewSubmissionReturnAlreadyCompleted extends Error { }
export class CloseNewSubmissionReturnAdminCommentEmpty extends Error { }

export class CloseNewSubmissionReturnInteractor implements IInteractor<CloseNewSubmissionReturnRequestDTO, CloseNewSubmissionReturnResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly emailService: IEmailService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionReturnId, adminComment }: CloseNewSubmissionReturnRequestDTO): Promise<ResultType<CloseNewSubmissionReturnResponseDTO>> {
    try {
      const submissionReturnIdBin = this.uuidService.uuidToBin(submissionReturnId);

      // find the submission return and submission
      const submissionReturn = await this.prisma.newSubmissionReturn.findFirst({
        where: { submissionReturnId: submissionReturnIdBin },
      });
      if (!submissionReturn) {
        return Result.fail(new CloseNewSubmissionReturnNotFound());
      }

      if (submissionReturn.completed) {
        return Result.fail(new CloseNewSubmissionReturnAlreadyCompleted());
      }

      if (adminComment.length === 0) {
        return Result.fail(new CloseNewSubmissionReturnAdminCommentEmpty());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedSubmissionReturn = await this.prisma.newSubmissionReturn.update({
        data: {
          completed: prismaNow,
          newSubmission: { update: { adminComment, submitted: null, modified: prismaNow } },
        },
        where: { submissionReturnId: submissionReturnIdBin },
        include: { newSubmission: { include: { enrollment: { include: { student: true } } } } },
      });

      if (updatedSubmissionReturn.newSubmission.enrollment.student.emailAddress) {
        try {
          const studentName = `${updatedSubmissionReturn.newSubmission.enrollment.student.firstName} ${updatedSubmissionReturn.newSubmission.enrollment.student.lastName}`;
          await this.sendStudentEmail(studentName, updatedSubmissionReturn.newSubmission.enrollment.student.emailAddress);
        } catch (err) {
          this.logger.error('Error sending student email', err);
        }
      }

      return Result.success({
        submissionReturnId: this.uuidService.binToUUID(updatedSubmissionReturn.submissionReturnId),
        submissionId: this.uuidService.binToUUID(updatedSubmissionReturn.submissionId),
        returned: updatedSubmissionReturn.returned,
        completed: updatedSubmissionReturn.completed,
        newSubmission: {
          submissionId: this.uuidService.binToUUID(updatedSubmissionReturn.newSubmission.submissionId),
          enrollmentId: updatedSubmissionReturn.newSubmission.enrollmentId,
          tutorId: updatedSubmissionReturn.newSubmission.tutorId,
          unitLetter: updatedSubmissionReturn.newSubmission.unitLetter,
          title: updatedSubmissionReturn.newSubmission.title,
          description: updatedSubmissionReturn.newSubmission.description,
          markingCriteria: updatedSubmissionReturn.newSubmission.markingCriteria,
          optional: updatedSubmissionReturn.newSubmission.optional,
          order: updatedSubmissionReturn.newSubmission.order,
          tutorComment: updatedSubmissionReturn.newSubmission.tutorComment,
          adminComment: updatedSubmissionReturn.newSubmission.adminComment,
          submitted: updatedSubmissionReturn.newSubmission.submitted,
          transferred: updatedSubmissionReturn.newSubmission.transferred,
          closed: updatedSubmissionReturn.newSubmission.closed,
          skipped: updatedSubmissionReturn.newSubmission.skipped,
          responseFilename: updatedSubmissionReturn.newSubmission.responseFilename,
          responseFilesize: updatedSubmissionReturn.newSubmission.responseFilesize,
          responseMimeTypeId: updatedSubmissionReturn.newSubmission.responseMimeTypeId,
          created: updatedSubmissionReturn.newSubmission.created,
          modified: updatedSubmissionReturn.newSubmission.modified,
        },
      });

    } catch (err) {
      this.logger.error('error updating submission return', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async sendStudentEmail(name: string, to: string): Promise<void> {
    const subject = 'Returned Unit';
    const textBody = `${name},\n\nYour tutor has notified us that one of your submissions is incomplete. You'll need to revise your work and resubmit. Please visit the the Online Student Center<https://studentcenter.qccareerschool.com> for further details.`;
    const htmlBody = `<p>${name},</p><p>Your tutor has notified us that one of your submissions is incomplete. You'll need to revise your work and resubmit. Please visit the the <a href="https://studentcenter.qccareerschool.com">Online Student Center</a> for further details.</p>`;

    await this.emailService.send(name, to, subject, htmlBody, textBody);
  }
}
