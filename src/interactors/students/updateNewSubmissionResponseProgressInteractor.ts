import type { Course, Enrollment, NewSubmission, PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type UpdateNewSubmissionResponseProgressRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
  progress: number;
};

export type UpdateNewSubmissionResponseProgressResponseDTO = Omit<NewSubmissionDTO, 'complete' | 'points' | 'mark'>;

abstract class UpdateNewSubmissionResponseProgressError extends Error { }
export class UpdateNewSubmissionResponseProgressNotFound extends UpdateNewSubmissionResponseProgressError { }
export class UpdateNewSubmissionResponseProgressLessThanZero extends UpdateNewSubmissionResponseProgressError { }
export class UpdateNewSubmissionResponseProgressGreaterThan100 extends UpdateNewSubmissionResponseProgressError { }

type SubmissionWithEnrollmentAndCourse = NewSubmission & { enrollment: Enrollment & { course: Course }; parent: NewSubmission | null };

export class UpdateNewSubmissionResponseProgressInteractor extends StudentInteractor<UpdateNewSubmissionResponseProgressRequestDTO, UpdateNewSubmissionResponseProgressResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, submissionId, progress }: UpdateNewSubmissionResponseProgressRequestDTO): Promise<ResultType<UpdateNewSubmissionResponseProgressResponseDTO>> {
    try {
      if (progress < 0) {
        return failure(new UpdateNewSubmissionResponseProgressLessThanZero());
      }

      if (progress > 100) {
        return failure(new UpdateNewSubmissionResponseProgressGreaterThan100());
      }

      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      let updatedSubmission: SubmissionWithEnrollmentAndCourse;

      try {
        updatedSubmission = await this.updateSubmission(studentId, courseId, submissionIdBin, progress);
      } catch (err) {
        if (err instanceof UpdateNewSubmissionResponseProgressError) {
          return failure(err);
        }
        throw err;
      }

      return success({
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
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async updateSubmission(studentId: number, courseId: number, submissionIdBin: Buffer, progress: number): Promise<SubmissionWithEnrollmentAndCourse> {
    const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

    return this.prisma.$transaction(async transaction => {
      const submission = await transaction.newSubmission.findFirst({
        where: { enrollment: { studentId, courseId }, submissionId: submissionIdBin },
        include: { enrollment: { include: { course: true } }, parent: true },
      });
      if (!submission) {
        throw new UpdateNewSubmissionResponseProgressNotFound();
      }

      if (submission.responseProgress !== null && submission.responseProgress >= progress) {
        return submission;
      }

      return this.prisma.newSubmission.update({
        where: { submissionId: submissionIdBin },
        data: { responseProgress: progress, modified: prismaNow },
        include: { enrollment: { include: { course: true } }, parent: true },
      });
    });
  }
}
