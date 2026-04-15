import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { FileStats, IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { InteractorFileStreamDownload } from '../index.js';
import { StudentInteractor } from './studentInteractor.js';

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
export class DownloadNewSubmissionFeedbackNotClosed extends Error { }
export class DownloadNewSubmissionFeedbackFileNotFound extends Error { }
export class DownloadNewSubmissionFeedbackFileReadError extends Error { }

export class DownloadNewSubmissionFeedbackInteractor extends StudentInteractor<DownloadNewSubmissionFeedbackRequestDTO, DownloadNewSubmissionFeedbackResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

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
        include: { enrollment: { include: { course: true } } },
      });

      if (!submission) {
        return failure(new DownloadNewSubmissionFeedbackNotFound());
      }

      if (!submission.submitted) {
        return failure(new DownloadNewSubmissionFeedbackNotSubmitted());
      }

      if (submission.skipped) {
        return failure(new DownloadNewSubmissionFeedbackSkipped());
      }

      if (!submission.closed) {
        return failure(new DownloadNewSubmissionFeedbackNotClosed());
      }

      // determine which file to use
      const file = await this.getFilePathAndStats(submission.enrollmentId, request.submissionId);
      if (!file) {
        return failure(new DownloadNewSubmissionFeedbackFileNotFound());
      }
      const [ filePath, stats ] = file;

      let filename = `${submission.enrollment.course.code}${submission.enrollment.studentNumber}_Unit_${submission.unitLetter}`;

      let extensionFound = false;
      if (submission.responseFilename) {
        const filenameParts = submission.responseFilename.split('.');
        const extension = filenameParts[filenameParts.length - 1];
        if (extension.length === 3) {
          extensionFound = true;
          filename += '.' + extension;
        }
      }

      if (!extensionFound) {
        if (submission.responseMimeTypeId === 'audio/mpeg') {
          filename += '.mp3';
        }
        if (submission.responseMimeTypeId === 'audio/x-m4a') {
          filename += '.m4a';
        }
      }

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

        return success({
          stream: fileStream,
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
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadNewSubmissionFeedbackFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        filename,
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: submission.responseMimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewSubmissionFeedbackInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading submission response', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getFilePathAndStats(enrollmentId: number, submissionId: string): Promise<[filePath: string, stats: FileStats] | false> {
    const paddedEnrollmentId = enrollmentId.toString().padStart(8, '0');
    const filePath = `${this.configService.config.paths.unitFeedbackPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}/${submissionId}`;

    // check if the file exists
    const stats = await this.fileService.stat(filePath);
    if (stats) {
      return [ filePath, stats ];
    }

    return false;
  }
}
