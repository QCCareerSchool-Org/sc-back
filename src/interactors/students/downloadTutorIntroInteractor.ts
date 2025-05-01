import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { FileStats, IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { InteractorFileStreamDownload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type DownloadTutorIntroRequestDTO = {
  studentId: number;
  courseId: number;
  startByte?: number;
  endByte?: number;
};

export type DownloadTutorIntroResponseDTO = InteractorFileStreamDownload;

export class DownloadTutorIntroEnrollmentNotFound extends Error { }
export class DownloadTutorIntroTutorNotAssigned extends Error { }
export class DownloadTutorIntroNotSubmitted extends Error { }
export class DownloadTutorIntroSkipped extends Error { }
export class DownloadTutorIntroNotClosed extends Error { }
export class DownloadTutorIntroFileNotFound extends Error { }
export class DownloadTutorIntroFileReadError extends Error { }

type FileExtension = 'mp3' | 'ogg' | 'm4a';

export class DownloadTutorIntroInteractor extends StudentInteractor<DownloadTutorIntroRequestDTO, DownloadTutorIntroResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute(request: DownloadTutorIntroRequestDTO): Promise<ResultType<DownloadTutorIntroResponseDTO>> {
    try {
      const { studentId, courseId, startByte, endByte } = request;

      // find the part medium
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          student: { studentId },
          course: { courseId },
        },
        include: { course: true, tutor: true },
      });

      if (!enrollment) {
        return Result.fail(new DownloadTutorIntroEnrollmentNotFound());
      }

      if (enrollment.tutor === null) {
        return Result.fail(new DownloadTutorIntroTutorNotAssigned());
      }

      // determine which file to use
      const file = await this.getFilePathAndStats(enrollment.tutor.tutorId, enrollment.course.code);
      if (!file) {
        return Result.fail(new DownloadTutorIntroFileNotFound());
      }
      const [ filePath, fileExtension, stats ] = file;

      const filename = `${enrollment.tutor.firstName} ${enrollment.tutor.firstName} Introduction for ${enrollment.course.name}.${fileExtension}`;

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read file ${filePath}`, err);
          throw new DownloadTutorIntroFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename,
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: this.getMimeType(fileExtension),
          maxAge: DownloadTutorIntroInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return Result.fail(new DownloadTutorIntroFileReadError(filePath));
      }

      return Result.success({
        stream: fileStream,
        filename,
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: this.getMimeType(fileExtension),
        maxAge: DownloadTutorIntroInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading tutor intro', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getFilePathAndStats(tutorId: number, courseCode: string): Promise<[filePath: string, fileExtension: FileExtension, stats: FileStats] | false> {
    // check if an MP3 exists
    const mp3FilePath = `${this.configService.config.paths.tutorIntroductionPath}/${tutorId}-${courseCode}.mp3`;
    const mp3Stats = await this.fileService.stat(mp3FilePath);
    if (mp3Stats) {
      return [ mp3FilePath, 'mp3', mp3Stats ];
    }

    // check if an M4A file exists
    const m4aFilePath = `${this.configService.config.paths.tutorIntroductionPath}/${tutorId}-${courseCode}.ogg`;
    const m4aStats = await this.fileService.stat(m4aFilePath);
    if (m4aStats) {
      return [ mp3FilePath, 'm4a', m4aStats ];
    }

    // check if an OGG file exists
    const oggFilePath = `${this.configService.config.paths.tutorIntroductionPath}/${tutorId}-${courseCode}.ogg`;
    const oggStats = await this.fileService.stat(oggFilePath);
    if (oggStats) {
      return [ mp3FilePath, 'ogg', oggStats ];
    }

    return false;
  }

  private getMimeType(fileExtension: FileExtension): string {
    switch (fileExtension) {
      case 'mp3':
        return 'audio/mpeg';
      case 'ogg':
        return 'audio/ogg';
      case 'm4a':
        return 'audio/x-m4a';
    }
  }
}
