import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DownloadNewPartMediumRequestDTO = {
  mediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewPartMediumResponseDTO = InteractorFileStreamDownload | string;

export class DownloadNewPartMediumNotFound extends Error { }
export class DownloadNewPartMediumFileNotFound extends Error { }
export class DownloadNewPartMediumFileReadError extends Error { }

export class DownloadNewPartMediumInteractor implements IInteractor<DownloadNewPartMediumRequestDTO, DownloadNewPartMediumResponseDTO> {
  private static readonly maxAge = 300;

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
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the assignment medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin },
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

      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find part medium file ${filePath}`);
        return Result.fail(new DownloadNewPartMediumFileNotFound(filePath));
      }

      if (typeof request.startByte !== 'undefined') {
        const start = request.startByte;
        const end = typeof request.endByte !== 'undefined' && request.endByte < stats.size ? request.endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read part medium file ${filePath}`, err);
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
        this.logger.error(`Could not read part medium file ${filePath}`, err);
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
      this.logger.error('error downloading assignment medium file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
