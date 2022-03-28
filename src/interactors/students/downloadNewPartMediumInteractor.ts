import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFileStream } from '..';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { ISanitizerService } from '../../services/sanitizer';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type DownloadNewPartMediumRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  mediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewPartMediumResponseDTO = InteractorFileStream | string;

export class DownloadNewPartMediumNotFound extends Error { }
export class DownloadNewPartMediumFileNotFound extends Error { }
export class DownloadNewPartMediumFileReadError extends Error { }

export class DownloadNewPartMediumInteractor implements IInteractor<DownloadNewPartMediumRequestDTO, DownloadNewPartMediumResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DownloadNewPartMediumRequestDTO): Promise<ResultType<DownloadNewPartMediumResponseDTO>> {
    try {
      const { studentId, courseId, startByte, endByte } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
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
                  newUnit: {
                    unitId: unitIdBin,
                    enrollment: { studentId, courseId, course: { enabled: true } },
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
        return Result.fail(new DownloadNewPartMediumNotFound());
      }

      if (partMedium.externalData !== null) {
        return Result.success(partMedium.externalData);
      }

      const filePath = `${this.configService.config.paths.partMediaPath}/${this.uuidService.binToUUID(partMedium.partMediumId)}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return Result.fail(new DownloadNewPartMediumFileNotFound(filePath));
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

        return Result.success({
          stream: fileStream,
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
        return Result.fail(new DownloadNewPartMediumFileReadError(filePath));
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(partMedium.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: partMedium.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewPartMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading part medium file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
