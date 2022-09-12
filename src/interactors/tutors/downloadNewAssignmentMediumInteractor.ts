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

export type DownloadNewAssignmentMediumRequestDTO = {
  tutorId: number;
  assignmentMediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewAssignmentMediumResponseDTO = InteractorFileStreamDownload;

export class DownloadNewAssignmentMediumNotFound extends Error { }
export class DownloadNewAssignmentMediumFileNotFound extends Error { }
export class DownloadNewAssignmentMediumFileReadError extends Error { }

export class DownloadNewAssignmentMediumInteractor implements IInteractor<DownloadNewAssignmentMediumRequestDTO, DownloadNewAssignmentMediumResponseDTO> {
  private static readonly maxAge = 300; // five minutes in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, assignmentMediumId, startByte, endByte }: DownloadNewAssignmentMediumRequestDTO): Promise<ResultType<DownloadNewAssignmentMediumResponseDTO>> {
    try {
      const assignmentMediumIdBin = this.uuidService.uuidToBin(assignmentMediumId);

      const newAssignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: {
          assignmentMediumId: assignmentMediumIdBin,
          newAssignments: { some: { newAssignment: { newSubmission: { NOT: { submitted: null }, enrollment: { tutorId } } } } },
        },
      });

      if (!newAssignmentMedium) {
        return Result.fail(new DownloadNewAssignmentMediumNotFound());
      }

      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${assignmentMediumId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find feedback file ${filePath}`);
        return Result.fail(new DownloadNewAssignmentMediumFileNotFound(filePath));
      }

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read assignment media file ${filePath}`, err);
          throw new DownloadNewAssignmentMediumFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(newAssignmentMedium.filename),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: newAssignmentMedium.mimeTypeId,
          maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read assignment media file ${filePath}`, err);
        throw new DownloadNewAssignmentMediumFileReadError();
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newAssignmentMedium.filename),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newAssignmentMedium.mimeTypeId,
        maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new assignment medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
