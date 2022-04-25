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
  tutorId: number;
  partMediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewPartMediumResponseDTO = InteractorFileStream;

export class DownloadNewPartMediumNotFound extends Error { }
export class DownloadNewPartMediumFileNotFound extends Error { }
export class DownloadNewPartMediumFileReadError extends Error { }

export class DownloadNewPartMediumInteractor implements IInteractor<DownloadNewPartMediumRequestDTO, DownloadNewPartMediumResponseDTO> {
  private static readonly maxAge = 300; // five minutes in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, partMediumId, startByte, endByte }: DownloadNewPartMediumRequestDTO): Promise<ResultType<DownloadNewPartMediumResponseDTO>> {
    try {
      const partMediumIdBin = this.uuidService.uuidToBin(partMediumId);

      const newPartMedium = await this.prisma.newPartMedium.findFirst({
        where: {
          partMediumId: partMediumIdBin,
          newParts: { some: { newPart: { newAssignment: { newUnit: { NOT: { submitted: null }, enrollment: { tutorId } } } } } },
        },
      });

      if (!newPartMedium) {
        return Result.fail(new DownloadNewPartMediumNotFound());
      }

      const filePath = `${this.configService.config.paths.partMediaPath}/${partMediumId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find feedback file ${filePath}`);
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
          this.logger.error(`Could not read part media file ${filePath}`, err);
          throw new DownloadNewPartMediumFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(newPartMedium.filename),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: newPartMedium.mimeTypeId,
          maxAge: DownloadNewPartMediumInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read part media file ${filePath}`, err);
        throw new DownloadNewPartMediumFileReadError();
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newPartMedium.filename),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newPartMedium.mimeTypeId,
        maxAge: DownloadNewPartMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new part medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
