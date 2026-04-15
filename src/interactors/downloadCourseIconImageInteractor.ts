import type { ReadStream } from 'fs';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../services/config/index.js';
import type { FileStats, IFileService } from '../services/file/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IInteractor, InteractorFileStreamDownload } from './index.js';

export type DownloadCourseIconImageRequestDTO = {
  courseId: number;
  startByte?: number;
  endByte?: number;
};

export type DownloadCourseIconImageResponseDTO = InteractorFileStreamDownload | string;

export class DownloadCourseIconImageFileNotFound extends Error { }
export class DownloadCourseIconImageFileReadError extends Error { }

export class DownloadCourseIconImageInteractor implements IInteractor<DownloadCourseIconImageRequestDTO, DownloadCourseIconImageResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, startByte, endByte }: DownloadCourseIconImageRequestDTO): Promise<ResultType<DownloadCourseIconImageResponseDTO>> {
    try {
      const [ filePath, stats ] = await this.getFileAndStats(courseId);

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read file ${filePath}`, err);
          throw new DownloadCourseIconImageFileReadError(filePath);
        }

        return success({
          stream: fileStream,
          filename: `course-icon-${courseId}.jpg`,
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: 'image/jpeg',
          maxAge: DownloadCourseIconImageInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadCourseIconImageFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        filename: `course-icon-${courseId}.jpg`,
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: 'image/jpeg',
        maxAge: DownloadCourseIconImageInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading course icon image', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getFileAndStats(courseId: number): Promise<[ filePath: string, stats: FileStats ]> {
    const filePath = `${this.configService.config.paths.courseIconsPath}/${courseId}.jpg`;
    const stats = await this.fileService.stat(filePath);
    if (stats) {
      return [ filePath, stats ];
    }

    this.logger.info(`No course icon found for course id ${courseId}`);

    const defaultFilePath = `${this.configService.config.paths.courseIconsPath}/default.jpg`;
    const defaultStats = await this.fileService.stat(defaultFilePath);
    if (defaultStats) {
      return [ defaultFilePath, defaultStats ];
    }

    throw new DownloadCourseIconImageFileNotFound(defaultFilePath);
  }
}
