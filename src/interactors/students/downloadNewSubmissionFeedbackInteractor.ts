import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { FileStats, IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type DownloadNewSubmissionFeedbackRequestDTO = {
  studentId: number;
  courseId: number;
  /** uuid */
  submissionId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewSubmissionFeedbackResponseDTO = InteractorFileStreamDownload;

export class DownloadNewSubmissionFeedbackNotFound extends Error { }
export class DownloadNewSubmissionFeedbackNotSubmitted extends Error { }
export class DownloadNewSubmissionFeedbackSkipped extends Error { }
export class DownloadNewSubmissionFeedbackFileNotFound extends Error { }
export class DownloadNewSubmissionFeedbackFileReadError extends Error { }

export class DownloadNewSubmissionFeedbackInteractor implements IInteractor<DownloadNewSubmissionFeedbackRequestDTO, DownloadNewSubmissionFeedbackResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DownloadNewSubmissionFeedbackRequestDTO): Promise<ResultType<DownloadNewSubmissionFeedbackResponseDTO>> {
    try {
      const { studentId, courseId, startByte, endByte } = request;
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);

      // find the part medium
      const submission = await this.prisma.newSubmission.findFirst({
        where: {
          enrollment: { studentId, courseId },
          submissionId: submissionIdBin,
        },
      });

      if (!submission) {
        return Result.fail(new DownloadNewSubmissionFeedbackNotFound());
      }

      if (!submission.submitted) {
        return Result.fail(new DownloadNewSubmissionFeedbackNotSubmitted());
      }

      if (submission.skipped) {
        return Result.fail(new DownloadNewSubmissionFeedbackSkipped());
      }

      // determine which file to use
      const file = await this.getFilePathAndStats(studentId, request.submissionId);
      if (!file) {
        return Result.fail(new DownloadNewSubmissionFeedbackFileNotFound());
      }
      const [ filePath, stats ] = file;

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read file ${filePath}`, err);
          throw new DownloadNewSubmissionFeedbackFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(submission.responseFilename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: submission.responseMimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewSubmissionFeedbackInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return Result.fail(new DownloadNewSubmissionFeedbackFileReadError(filePath));
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(submission.responseFilename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: submission.responseMimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewSubmissionFeedbackInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading submission response', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getFilePathAndStats(studentId: number, submissionId: string): Promise<[filePath: string, stats: FileStats] | false> {
    const paddedStudentId = studentId.toString().padStart(8, '0');
    const filePath = `${this.configService.config.paths.unitFeedbackPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${submissionId}`;

    // check if the file exists
    const stats = await this.fileService.stat(filePath);
    if (stats) {
      return [ filePath, stats ];
    }

    return false;
  }
}
