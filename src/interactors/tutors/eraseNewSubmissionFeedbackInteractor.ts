import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type EraseNewSubmissionFeedbackRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
};

export type EraseNewSubmissionFeedbackResponseDTO = NewSubmissionDTO;

export class EraseNewSubmissionFeedbackNotFound extends Error { }
export class EraseNewSubmissionFeedbackSubmissionNotSubmitted extends Error { }
export class EraseNewSubmissionFeedbackSubmissionSkipped extends Error { }
export class EraseNewSubmissionFeedbackSubmissionAlreadyClosed extends Error { }
export class EraseNewSubmissionFeedbackWrongTutor extends Error { }
export class EraseNewSubmissionFeedbackFileUnlinkError extends Error { }

export class EraseNewSubmissionFeedbackInteractor implements IInteractor<EraseNewSubmissionFeedbackRequestDTO, EraseNewSubmissionFeedbackResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId }: EraseNewSubmissionFeedbackRequestDTO): Promise<ResultType<EraseNewSubmissionFeedbackResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const newSubmission = await this.prisma.newSubmission.findFirst({
        where: {
          submissionId: submissionIdBin,
          enrollment: { studentId },
        },
      });

      if (!newSubmission) {
        return Result.fail(new EraseNewSubmissionFeedbackNotFound());
      }

      if (!newSubmission.submitted) {
        return Result.fail(new EraseNewSubmissionFeedbackSubmissionNotSubmitted());
      }

      if (newSubmission.skipped) {
        return Result.fail(new EraseNewSubmissionFeedbackSubmissionSkipped());
      }

      if (newSubmission.closed) {
        return Result.fail(new EraseNewSubmissionFeedbackSubmissionAlreadyClosed());
      }

      if (newSubmission.tutorId !== tutorId) {
        return Result.fail(new EraseNewSubmissionFeedbackWrongTutor());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedSubmission = await this.prisma.$transaction(async transaction => {
        const updated = await transaction.newSubmission.update({
          data: {
            responseFilename: null,
            responseFilesize: null,
            responseMimeTypeId: null,
            modified: prismaNow,
          },
          where: { submissionId: submissionIdBin },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });

        const paddedEnrollmentId = newSubmission.enrollmentId.toString().padStart(8, '0');

        // delete the file
        const filePath = `${this.configService.config.paths.unitFeedbackPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}/${submissionId}`;
        try {
          await this.fileService.unlink(filePath);
        } catch (err) {
          this.logger.error(`Could not unlink feedback ${filePath}`, err);
          throw new EraseNewSubmissionFeedbackFileUnlinkError();
        }

        return updated;
      });

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;

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
        created: this.dateService.fixPrismaReadDate(updatedSubmission.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubmission.modified),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submissionMarked ? submissionMark : null,
      });

    } catch (err) {
      this.logger.error('error deleting new submission feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
