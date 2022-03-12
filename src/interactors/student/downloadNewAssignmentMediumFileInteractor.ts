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

export type DownloadNewAssignmentMediumFileRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  mediumId: string;
};

export type DownloadNewAssignmentMediumFileResponseDTO = InteractorFileStream;

export class DownloadNewAssignmentMediumFileNotFound extends Error { }
export class DownloadNewAssignmentMediumFileFileNotFound extends Error { }
export class DownloadNewAssignmentMediumFileReadError extends Error { }

export class DownloadNewAssignmentMediumFileInteractor implements IInteractor<DownloadNewAssignmentMediumFileRequestDTO, DownloadNewAssignmentMediumFileResponseDTO> {

  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DownloadNewAssignmentMediumFileRequestDTO): Promise<ResultType<DownloadNewAssignmentMediumFileResponseDTO>> {
    try {
      const { studentId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the assignment medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: {
          assignmentMediumId: mediumIdBin,
          newAssignments: {
            some: {
              assignmentId: assignmentIdBin,
              newAssignment: {
                newUnit: {
                  unitId: unitIdBin,
                  enrollment: { studentId, courseId, course: { enabled: true } },
                },
              },
            },
          },
        },
        include: {
          mimeType: true,
        },
      });
      if (!assignmentMedium) {
        return Result.fail(new DownloadNewAssignmentMediumFileNotFound());
      }

      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(assignmentMedium.assignmentMediumId)}`;

      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return Result.fail(new DownloadNewAssignmentMediumFileFileNotFound(filePath));
      }

      // read the file
      let stream: ReadStream;
      try {
        stream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error('Could not read file', err);
        return Result.fail(new DownloadNewAssignmentMediumFileReadError());
      }

      return Result.success({
        stream,
        filename: this.sanitizerService.sanitizeFilename(assignmentMedium.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: assignmentMedium.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewAssignmentMediumFileInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading assignment medium file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
