import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { InteractorFileStreamDownload } from '../index.js';
import { StudentInteractor } from './studentInteractor.js';

export type DownloadNewAssignmentMediumRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
  assignmentId: string;
  mediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewAssignmentMediumResponseDTO = InteractorFileStreamDownload | string;

abstract class DownloadNewAssignmentMediumError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class DownloadNewAssignmentMediumNotFound extends DownloadNewAssignmentMediumError { }
export class DownloadNewAssignmentMediumFileNotFound extends DownloadNewAssignmentMediumError { }
export class DownloadNewAssignmentMediumFileReadError extends DownloadNewAssignmentMediumError { }

export class DownloadNewAssignmentMediumInteractor extends StudentInteractor<DownloadNewAssignmentMediumRequestDTO, DownloadNewAssignmentMediumResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute(request: DownloadNewAssignmentMediumRequestDTO): Promise<ResultType<DownloadNewAssignmentMediumResponseDTO>> {
    try {
      const { studentId, courseId, startByte, endByte } = request;
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the assignment medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: {
          assignmentMediumId: mediumIdBin,
          newAssignments: {
            some: {
              assignmentId: assignmentIdBin,
              newAssignment: {
                newSubmission: {
                  submissionId: submissionIdBin,
                  enrollment: { studentId, courseId },
                },
              },
            },
          },
        },
        include: {
          mimeType: true,
        },
      });
      if (!assignmentMedium) {
        return failure(new DownloadNewAssignmentMediumNotFound());
      }

      if (assignmentMedium.externalData !== null) {
        return success(assignmentMedium.externalData);
      }

      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(assignmentMedium.assignmentMediumId)}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return failure(new DownloadNewAssignmentMediumFileNotFound(filePath));
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
          throw new DownloadNewAssignmentMediumFileReadError(filePath);
        }

        return success({
          stream: fileStream,
          download: true,
          filename: this.sanitizerService.sanitizeFilename(assignmentMedium.filename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: assignmentMedium.mimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadNewAssignmentMediumFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        download: true,
        filename: this.sanitizerService.sanitizeFilename(assignmentMedium.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: assignmentMedium.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading assignment medium file', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
