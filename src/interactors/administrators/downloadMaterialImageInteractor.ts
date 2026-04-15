import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { FileStats, IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';

export type DownloadMaterialImageRequestDTO = {
  /** uuid */
  materialId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadMaterialImageResponseDTO = InteractorFileStreamDownload | string;

export class DownloadMaterialImageNotFound extends Error { }
export class DownloadMaterialImageFileNotFound extends Error { }
export class DownloadMaterialImageFileReadError extends Error { }

export class DownloadMaterialImageInteractor implements IInteractor<DownloadMaterialImageRequestDTO, DownloadMaterialImageResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DownloadMaterialImageRequestDTO): Promise<ResultType<DownloadMaterialImageResponseDTO>> {
    try {
      const { startByte, endByte } = request;
      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      // find the part medium
      const material = await this.prisma.material.findFirst({
        where: { materialId: materialIdBin },
        include: { imageMimeType: true },
      });
      if (!material) {
        return failure(new DownloadMaterialImageNotFound());
      }

      // determine which file to use
      const file = await this.getFilePathAndStats(request.materialId);
      if (!file) {
        return failure(new DownloadMaterialImageFileNotFound());
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
          throw new DownloadMaterialImageFileReadError(filePath);
        }

        return success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(material.filename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: material.imageMimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadMaterialImageInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadMaterialImageFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(material.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: material.imageMimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadMaterialImageInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading material image', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getFilePathAndStats(materialId: string): Promise<[filePath: string, stats: FileStats] | false> {

    const filePath = `${this.configService.config.paths.materials.images}/${materialId}`;

    // check if the file exists
    const stats = await this.fileService.stat(filePath);
    if (stats) {
      return [ filePath, stats ];
    }

    const defaultFilePath = `${this.configService.config.paths.materials.images}/default-lesson.png`;
    const defaultStats = await this.fileService.stat(defaultFilePath);
    if (defaultStats) {
      return [ defaultFilePath, defaultStats ];
    }

    return false;
  }
}
