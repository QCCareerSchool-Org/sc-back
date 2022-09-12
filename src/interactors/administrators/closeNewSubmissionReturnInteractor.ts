import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/newSubmissionDTO.js';
import type { NewSubmissionReturnDTO } from '../../domain/newSubmissionReturnDTO.js';
import type { IDateService } from '../../services/date/index.js';
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
  newSubmission: Omit<NewSubmissionDTO, 'points' | 'mark' | 'complete'>;
};

export class CloseNewSubmissionReturnNotFound extends Error { }
export class CloseNewSubmissionReturnAlreadyCompleted extends Error { }
export class CloseNewSubmissionReturnAdminCommentEmpty extends Error { }

export class CloseNewSubmissionReturnInteractor implements IInteractor<CloseNewSubmissionReturnRequestDTO, CloseNewSubmissionReturnResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
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

      const updatedSubmissionReturn = await this.prisma.newSubmissionReturn.update({
        data: {
          completed: this.dateService.getDate(),
          newSubmission: { update: { adminComment } },
        },
        where: { submissionReturnId: submissionReturnIdBin },
        include: { newSubmission: true },
      });

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
}
