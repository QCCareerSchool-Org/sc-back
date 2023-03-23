import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DownloadNewSubmissionFeedbackRequestDTO = {
  submissionId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewSubmissionFeedbackResponseDTO = InteractorFileStreamDownload;

export class DownloadNewSubmissionFeedbackSubmissionNotFound extends Error { }
export class DownloadNewSubmissionFeedbackSubmissionNotSubmitted extends Error { }
export class DownloadNewSubmissionFeedbackSubmissionSkipped extends Error { }
export class DownloadNewSubmissionFeedbackSubmissionNotClosed extends Error { }
export class DownloadNewSubmissionFeedbackFileNotFound extends Error { }
export class DownloadNewSubmissionFeedbackFileReadError extends Error { }

export class DownloadNewSubmissionFeedbackInteractor implements IInteractor<DownloadNewSubmissionFeedbackRequestDTO, DownloadNewSubmissionFeedbackResponseDTO> {
  private static readonly maxAge = 300;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionId, startByte, endByte }: DownloadNewSubmissionFeedbackRequestDTO): Promise<ResultType<DownloadNewSubmissionFeedbackResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      // find the submission
      const submission = await this.prisma.newSubmission.findFirst({
        where: { submissionId: submissionIdBin },
        include: { enrollment: { include: { course: true } } },
      });
      if (!submission) {
        return Result.fail(new DownloadNewSubmissionFeedbackSubmissionNotFound());
      }

      if (!submission.submitted) {
        return Result.fail(new DownloadNewSubmissionFeedbackSubmissionNotSubmitted());
      }

      if (submission.skipped) {
        return Result.fail(new DownloadNewSubmissionFeedbackSubmissionSkipped());
      }

      if (!submission.closed) {
        return Result.fail(new DownloadNewSubmissionFeedbackSubmissionNotClosed());
      }

      const filePath = this.getFilePath(submission.enrollmentId, submissionId);
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find submission feedback file ${filePath}`);
        return Result.fail(new DownloadNewSubmissionFeedbackFileNotFound(filePath));
      }

      const filename = `${submission.enrollment.course.code}${submission.enrollment.studentNumber}_Unit_${submission.unitLetter}.mp3`;

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read submission feedback file ${filePath}`, err);
          throw new DownloadNewSubmissionFeedbackFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          download: true,
          filename,
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
        this.logger.error(`Could not read part medium file ${filePath}`, err);
        return Result.fail(new DownloadNewSubmissionFeedbackFileReadError(filePath));
      }

      return Result.success({
        stream: fileStream,
        download: true,
        filename,
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: submission.responseMimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewSubmissionFeedbackInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading submission feedback file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private getFilePath(studentId: number, submissionId: string): string {
    const paddedStudentId = studentId.toString().padStart(8, '0');
    return `${this.configService.config.paths.unitFeedbackPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${submissionId}`;
  }
}
