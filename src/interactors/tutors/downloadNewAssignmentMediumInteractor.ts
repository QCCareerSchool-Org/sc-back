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

export type DownloadNewAssignmentMediumRequestDTO = {
  tutorId: number;
  assignmentMediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewAssignmentMediumResponseDTO = InteractorFileStreamDownload | string;

abstract class DownloadNewAssignmentMediumError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class DownloadNewAssignmentMediumNotFound extends DownloadNewAssignmentMediumError { }
export class DownloadNewAssignmentMediumFileNotFound extends DownloadNewAssignmentMediumError { }
export class DownloadNewAssignmentMediumFileReadError extends DownloadNewAssignmentMediumError { }

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
          newAssignments: { some: { newAssignment: { newSubmission: {
            NOT: { submitted: null },
            OR: [ { enrollment: { tutorId } }, { tutorId } ], // either the tutor of the enrollment in general, or the tutor assigned to this submission
          } } } },
        },
      });

      if (!newAssignmentMedium) {
        return failure(new DownloadNewAssignmentMediumNotFound());
      }

      if (newAssignmentMedium.externalData !== null) {
        return success(newAssignmentMedium.externalData);
      }

      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${assignmentMediumId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find feedback file ${filePath}`);
        return failure(new DownloadNewAssignmentMediumFileNotFound(filePath));
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

        return success({
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

      return success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newAssignmentMedium.filename),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newAssignmentMedium.mimeTypeId,
        maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new assignment medium', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
