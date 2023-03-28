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

export type DownloadNewUploadSlotRequestDTO = {
  uploadSlotId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewUploadSlotResponseDTO = InteractorFileStreamDownload;

export class DownloadNewUploadSlotNotFound extends Error { }
export class DownloadNewUploadSlotFileNotFound extends Error { }
export class DownloadNewUploadSlotFileReadError extends Error { }

export class DownloadNewUploadSlotInteractor implements IInteractor<DownloadNewUploadSlotRequestDTO, DownloadNewUploadSlotResponseDTO> {
  private static readonly maxAge = 300; // five minutes in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ uploadSlotId, startByte, endByte }: DownloadNewUploadSlotRequestDTO): Promise<ResultType<DownloadNewUploadSlotResponseDTO>> {
    try {
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      const newUploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: { uploadSlotId: uploadSlotIdBin },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
      });

      if (!newUploadSlot) {
        return Result.fail(new DownloadNewUploadSlotNotFound());
      }

      const paddedEnrollmentId = newUploadSlot.newPart.newAssignment.newSubmission.enrollmentId.toString().padStart(8, '0');
      const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}/${uploadSlotId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find upload slot file ${filePath}`);
        return Result.fail(new DownloadNewUploadSlotFileNotFound(filePath));
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
          throw new DownloadNewUploadSlotFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(newUploadSlot.filename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: newUploadSlot.mimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewUploadSlotInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read part media file ${filePath}`, err);
        throw new DownloadNewUploadSlotFileReadError();
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newUploadSlot.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newUploadSlot.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewUploadSlotInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new upload slot', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
