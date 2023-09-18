import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IMimeTypeService } from '../../services/mimeType/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileMemoryUpload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type UploadNewSubmissionFeedbackRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
  file: InteractorFileMemoryUpload;
};

export type UploadNewSubmissionFeedbackResponseDTO = NewSubmissionDTO;

export class UploadNewSubmissionFeedbackNotFound extends Error { }
export class UploadNewSubmissionFeedbackSubmissionNotSubmitted extends Error { }
export class UploadNewSubmissionFeedbackSubmissionSkipped extends Error { }
export class UploadNewSubmissionFeedbackSubmissionAlreadyClosed extends Error { }
export class UploadNewSubmissionFeedbackWrongTutor extends Error { }
export class UploadNewSubmissionFeedbackMimeTypeDoesntMatch extends Error {
  public constructor(public readonly detected: string, public readonly expected: string, message?: string) {
    super(message);
  }
}
export class UploadNewSubmissionFeedbackUnknownMimeType extends Error { }
export class UploadNewSubmissionFeedbackInvalidMimeType extends Error { }
export class UploadNewSubmissionFeedbackCouldNotCreateDirectory extends Error { }
export class UploadNewSubmissionFeedbackFileWriteError extends Error { }

export class UploadNewSubmissionFeedbackInteractor implements IInteractor<UploadNewSubmissionFeedbackRequestDTO, UploadNewSubmissionFeedbackResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly mimeTypeService: IMimeTypeService,
    private readonly sanitizerService: ISanitizerService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId, file }: UploadNewSubmissionFeedbackRequestDTO): Promise<ResultType<UploadNewSubmissionFeedbackResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const newSubmission = await this.prisma.newSubmission.findFirst({
        where: {
          submissionId: submissionIdBin,
          enrollment: { studentId },
        },
      });

      if (!newSubmission) {
        return Result.fail(new UploadNewSubmissionFeedbackNotFound());
      }

      if (!newSubmission.submitted) {
        return Result.fail(new UploadNewSubmissionFeedbackSubmissionNotSubmitted());
      }

      if (newSubmission.skipped) {
        return Result.fail(new UploadNewSubmissionFeedbackSubmissionSkipped());
      }

      if (newSubmission.closed) {
        return Result.fail(new UploadNewSubmissionFeedbackSubmissionAlreadyClosed());
      }

      if (newSubmission.tutorId !== tutorId) {
        return Result.fail(new UploadNewSubmissionFeedbackWrongTutor());
      }

      const detectedMimeType = await this.mimeTypeService.getTypeFromBuffer(file.data);
      if (detectedMimeType !== file.mimeType) {
        return Result.fail(new UploadNewSubmissionFeedbackMimeTypeDoesntMatch(detectedMimeType, file.mimeType));
      }

      const updatedSubmission = await this.prisma.$transaction(async transaction => {
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: file.mimeType },
        });
        if (!mimeType) {
          throw new UploadNewSubmissionFeedbackUnknownMimeType(file.mimeType);
        }

        if (!mimeType.mimeTypeId.startsWith('audio/')) {
          throw new UploadNewSubmissionFeedbackInvalidMimeType(mimeType.mimeTypeId);
        }

        const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

        const updated = await transaction.newSubmission.update({
          data: {
            responseFilename: this.sanitizerService.shortenSanitizedFilename(this.sanitizerService.sanitizeFilename(file.filename)),
            responseFilesize: file.size,
            responseMimeTypeId: mimeType.mimeTypeId,
            modified: prismaNow,
          },
          where: { submissionId: submissionIdBin },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });

        const paddedEnrollmentId = updated.enrollmentId.toString().padStart(8, '0');

        const path = `${this.configService.config.paths.unitFeedbackPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;
        try {
          if (!await this.fileService.stat(path)) {
            await this.fileService.mkdir(path);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewSubmissionFeedbackCouldNotCreateDirectory(path);
        }

        // save the file
        const filePath = `${path}/${submissionId}`;
        try {
          await this.fileService.writeFile(filePath, file.data);
        } catch (err) {
          this.logger.error(`Could not write feedback to ${filePath}`, err);
          throw new UploadNewSubmissionFeedbackFileWriteError();
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
      this.logger.error('error uploading new submission feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
