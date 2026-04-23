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

export type DownloadNewPartMediumRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
  assignmentId: string;
  partId: string;
  mediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewPartMediumResponseDTO = InteractorFileStreamDownload | string;

abstract class DownloadNewPartMediumError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class DownloadNewPartMediumNotFound extends DownloadNewPartMediumError { }
export class DownloadNewPartMediumFileNotFound extends DownloadNewPartMediumError { }
export class DownloadNewPartMediumFileReadError extends DownloadNewPartMediumError { }

export class DownloadNewPartMediumInteractor extends StudentInteractor<DownloadNewPartMediumRequestDTO, DownloadNewPartMediumResponseDTO> {
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

  public async execute(request: DownloadNewPartMediumRequestDTO): Promise<ResultType<DownloadNewPartMediumResponseDTO>> {
    try {
      const { studentId, courseId, startByte, endByte } = request;
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the part medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: {
          partMediumId: mediumIdBin,
          newParts: {
            some: {
              partId: partIdBin,
              newPart: {
                newAssignment: {
                  assignmentId: assignmentIdBin,
                  newSubmission: {
                    submissionId: submissionIdBin,
                    enrollment: { studentId, courseId },
                  },
                },
              },
            },
          },
        },
        include: {
          mimeType: true,
        },
      });
      if (!partMedium) {
        return failure(new DownloadNewPartMediumNotFound());
      }

      if (partMedium.externalData !== null) {
        return success(partMedium.externalData);
      }

      const filePath = `${this.configService.config.paths.partMediaPath}/${this.uuidService.binToUUID(partMedium.partMediumId)}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return failure(new DownloadNewPartMediumFileNotFound(filePath));
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
          throw new DownloadNewPartMediumFileReadError(filePath);
        }

        return success({
          stream: fileStream,
          download: true,
          filename: this.sanitizerService.sanitizeFilename(partMedium.filename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: partMedium.mimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewPartMediumInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadNewPartMediumFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        download: true,
        filename: this.sanitizerService.sanitizeFilename(partMedium.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: partMedium.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewPartMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading part medium file', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
