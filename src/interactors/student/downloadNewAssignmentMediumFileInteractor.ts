import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
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

export type DownloadNewAssignmentMediumFileResponseDTO = InteractorFile;

export class DownloadNewAssignmentMediumFileNotFound extends Error { }
export class DownloadNewAssignmentMediumFileReadError extends Error { }

export class DownloadNewAssignmentMediumFileInteractor implements IInteractor<DownloadNewAssignmentMediumFileRequestDTO, DownloadNewAssignmentMediumFileResponseDTO> {

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

      // read the file
      let fileData: Buffer;
      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(assignmentMedium.assignmentMediumId)}`;
      try {
        fileData = await this.fileService.readFile(filePath);
      } catch (err) {
        this.logger.error('Could not read file', err);
        return Result.fail(new DownloadNewAssignmentMediumFileReadError());
      }

      return Result.success({
        data: fileData,
        filename: this.sanitizerService.sanitizeFilename(assignmentMedium.filename ?? 'unknown'),
        size: fileData.length,
        mimeType: assignmentMedium.mimeTypeId ?? 'application/octet-stream',
      });

    } catch (err) {
      this.logger.error('error downloading assignment medium file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
