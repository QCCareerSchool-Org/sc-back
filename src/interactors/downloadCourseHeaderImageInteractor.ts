import type { ReadStream } from 'fs';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../services/config/index.js';
import type { IFileService } from '../services/file/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IInteractor, InteractorFileStreamDownload } from './index.js';

export type DownloadCourseHeaderImageRequestDTO = {
  courseId: number;
  startByte?: number;
  endByte?: number;
};

export type DownloadCourseHeaderImageResponseDTO = InteractorFileStreamDownload | string;

export class DownloadCourseHeaderImageFileNotFound extends Error { }
export class DownloadCourseHeaderImageFileReadError extends Error { }

export class DownloadCourseHeaderImageInteractor implements IInteractor<DownloadCourseHeaderImageRequestDTO, DownloadCourseHeaderImageResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, startByte, endByte }: DownloadCourseHeaderImageRequestDTO): Promise<ResultType<DownloadCourseHeaderImageResponseDTO>> {
    try {
      const filePath = `${this.configService.config.paths.courseBannersPath}/${courseId}.jpg`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return failure(new DownloadCourseHeaderImageFileNotFound(filePath));
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
          throw new DownloadCourseHeaderImageFileReadError(filePath);
        }

        return success({
          stream: fileStream,
          filename: `course-banner-${courseId}.jpg`,
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: 'image/jpeg',
          maxAge: DownloadCourseHeaderImageInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadCourseHeaderImageFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        filename: `course-banner-${courseId}.jpg`,
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: 'image/jpeg',
        maxAge: DownloadCourseHeaderImageInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading course header image', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
