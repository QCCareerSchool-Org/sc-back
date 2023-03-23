import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type DownloadNewSubmissionFeedbackRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewSubmissionFeedbackResponseDTO = InteractorFileStreamDownload;

export class DownloadNewSubmissionFeedbackNotFound extends Error { }
export class DownloadNewSubmissionFeedbackNotSubmitted extends Error { }
export class DownloadNewSubmissionFeedbackSkipped extends Error { }
export class DownloadNewSubmissionFeedbackWrongTutor extends Error { }
export class DownloadNewSubmissionFeedbackFileNotFound extends Error { }
export class DownloadNewSubmissionFeedbackFileReadError extends Error { }

export class DownloadNewSubmissionFeedbackInteractor implements IInteractor<DownloadNewSubmissionFeedbackRequestDTO, DownloadNewSubmissionFeedbackResponseDTO> {
  private static readonly maxAge = 300; // five minutes in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId, startByte, endByte }: DownloadNewSubmissionFeedbackRequestDTO): Promise<ResultType<DownloadNewSubmissionFeedbackResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const newSubmission = await this.prisma.newSubmission.findFirst({
        where: {
          submissionId: submissionIdBin,
          enrollment: { studentId },
        },
      });

      if (!newSubmission) {
        return Result.fail(new DownloadNewSubmissionFeedbackNotFound());
      }

      if (!newSubmission.submitted) {
        return Result.fail(new DownloadNewSubmissionFeedbackNotSubmitted());
      }

      if (newSubmission.skipped) {
        return Result.fail(new DownloadNewSubmissionFeedbackSkipped());
      }

      if (newSubmission.tutorId !== tutorId) {
        return Result.fail(new DownloadNewSubmissionFeedbackWrongTutor());
      }

      const paddedEnrollmentId = newSubmission.enrollmentId.toString().padStart(8, '0');
      const paddedStudentId = studentId.toString().padStart(8, '0');
      const filePath = newSubmission.newLocation
        ? `${this.configService.config.paths.unitFeedbackPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}/${submissionId}`
        : `${this.configService.config.paths.unitFeedbackPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${submissionId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find feedback file ${filePath}`);
        return Result.fail(new DownloadNewSubmissionFeedbackFileNotFound(filePath));
      }

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read feedback file ${filePath}`, err);
          throw new DownloadNewSubmissionFeedbackFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(newSubmission.responseFilename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: newSubmission.responseMimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewSubmissionFeedbackInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read feedback file ${filePath}`, err);
        throw new DownloadNewSubmissionFeedbackFileReadError();
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newSubmission.responseFilename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newSubmission.responseMimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewSubmissionFeedbackInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new submission feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
