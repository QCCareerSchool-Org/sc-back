import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFileStream } from '..';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { ISanitizerService } from '../../services/sanitizer';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type DownloadNewAssignmentMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  mediumId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewAssignmentMediumResponseDTO = InteractorFileStream | string;

export class DownloadNewAssignmentMediumNotFound extends Error { }
export class DownloadNewAssignmentMediumFileNotFound extends Error { }
export class DownloadNewAssignmentMediumFileReadError extends Error { }

export class DownloadNewAssignmentMediumInteractor implements IInteractor<DownloadNewAssignmentMediumRequestDTO, DownloadNewAssignmentMediumResponseDTO> {
  private static readonly maxAge = 300;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DownloadNewAssignmentMediumRequestDTO): Promise<ResultType<DownloadNewAssignmentMediumResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the assignment medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: { assignmentMediumId: mediumIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
        include: {
          mimeType: true,
        },
      });
      if (!assignmentMedium) {
        return Result.fail(new DownloadNewAssignmentMediumNotFound());
      }

      if (assignmentMedium.externalData !== null) {
        return Result.success(assignmentMedium.externalData);
      }

      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(assignmentMedium.assignmentMediumId)}`;

      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find assignment medium file ${filePath}`);
        return Result.fail(new DownloadNewAssignmentMediumFileNotFound(filePath));
      }

      if (typeof request.startByte !== 'undefined') {
        const start = request.startByte;
        const end = typeof request.endByte !== 'undefined' && request.endByte < stats.size ? request.endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read assignment medium file ${filePath}`, err);
          throw new DownloadNewAssignmentMediumFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(assignmentMedium.filename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: assignmentMedium.mimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read assignment medium file ${filePath}`, err);
        return Result.fail(new DownloadNewAssignmentMediumFileReadError(filePath));
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(assignmentMedium.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: assignmentMedium.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewAssignmentMediumInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading assignment medium file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
