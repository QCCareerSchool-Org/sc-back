import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type SkipNewSubmissionRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
};

export type SkipNewSubmissionResponseDTO = Omit<NewSubmissionDTO, 'complete' | 'points' | 'mark'>;

export class SkipNewSubmissionNotFound extends Error { }
export class SkipNewSubmissionEnrollmentOnHold extends Error { }
export class SkipNewSubmissionAlreadySubmitted extends Error { }

export class SkipNewSubmissionInteractor implements IInteractor<SkipNewSubmissionRequestDTO, SkipNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, submissionId }: SkipNewSubmissionRequestDTO): Promise<ResultType<SkipNewSubmissionResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const submission = await this.prisma.newSubmission.findFirst({
        where: {
          enrollment: { studentId, courseId },
          submissionId: submissionIdBin,
        },
        include: {
          enrollment: true,
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
        },
      });

      if (!submission) {
        return Result.fail(new SkipNewSubmissionNotFound());
      }

      if (submission.enrollment.onHold) {
        return Result.fail(new SkipNewSubmissionEnrollmentOnHold());
      }

      if (submission.submitted) {
        return Result.fail(new SkipNewSubmissionAlreadySubmitted());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedSubmission = await this.prisma.newSubmission.update({
        data: {
          submitted: prismaNow,
          skipped: true,
          tutorId: submission.enrollment.tutorId,
          modified: prismaNow,
        },
        where: { submissionId: submissionIdBin },
        include: { enrollment: { include: { course: true } } },
      });

      return Result.success({
        submissionId: this.uuidService.binToUUID(updatedSubmission.submissionId),
        enrollmentId: updatedSubmission.enrollmentId,
        tutorId: updatedSubmission.tutorId,
        unitLetter: updatedSubmission.unitLetter,
        title: updatedSubmission.title,
        description: updatedSubmission.description,
        markingCriteria: null,
        optional: updatedSubmission.optional,
        order: updatedSubmission.order,
        tutorComment: null,
        adminComment: submission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(updatedSubmission.submitted),
        transferred: this.dateService.fixPrismaReadDate(updatedSubmission.transferred),
        closed: this.dateService.fixPrismaReadDate(updatedSubmission.closed),
        skipped: updatedSubmission.skipped,
        responseFilename: updatedSubmission.responseFilename === null ? null : `${updatedSubmission.enrollment.course.code}${updatedSubmission.enrollment.enrollmentId} Submission ${updatedSubmission.unitLetter}.mp3`,
        responseFilesize: updatedSubmission.responseFilesize,
        responseMimeTypeId: updatedSubmission.responseMimeTypeId,
        responseProgress: updatedSubmission.responseProgress,
        created: this.dateService.fixPrismaReadDate(updatedSubmission.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubmission.modified),
      });

    } catch (err) {
      this.logger.error('error skipping new submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
