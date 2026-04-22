import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';

export type DownloadNewPartMediumRequestDTO = {
  tutorId: number;
  partMediumId: string;
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
          newParts: { some: { newPart: { newAssignment: { newSubmission: {
            NOT: { submitted: null },
            OR: [ { enrollment: { tutorId } }, { tutorId } ], // either the tutor of the enrollment in general, or the tutor assigned to this submission
          } } } } },
        },
      });

      if (!newPartMedium) {
        return failure(new DownloadNewPartMediumNotFound());
      }

      if (newPartMedium.externalData !== null) {
        return success(newPartMedium.externalData);
      }

      const filePath = `${this.configService.config.paths.partMediaPath}/${partMediumId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find feedback file ${filePath}`);
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
          this.logger.error(`Could not read part media file ${filePath}`, err);
          throw new DownloadNewPartMediumFileReadError(filePath);
        }

        return success({
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

      return success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newPartMedium.filename),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newPartMedium.mimeTypeId,
        maxAge: DownloadNewPartMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new part medium', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
