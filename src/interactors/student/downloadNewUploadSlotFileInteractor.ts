import { PrismaClient } from '@prisma/client';

import { IInteractor, InteractorFile } from '..';
import { ICompressionService } from '../../services/compression';
import { IConfigService } from '../../services/config';
import { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import { ISanitizerService } from '../../services/sanitizer';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type DownloadNewUploadSlotFileRequestDTO = {
  studentId: number;
  courseId: number;
  /** uuid */
  unitId: string;
  /** uuid */
  assignmentId: string;
  /** uuid */
  partId: string;
  /** uuid */
  uploadSlotId: string;
};

export type DownloadNewUploadSlotFileResponseDTO = InteractorFile;

export class DownloadNewUploadSlotFileNotFound extends Error { }
export class DownloadNewUploadSlotFileReadError extends Error { }

export class DownloadNewUploadSlotFileInteractor implements IInteractor<DownloadNewUploadSlotFileRequestDTO, DownloadNewUploadSlotFileResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly compressionService: ICompressionService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId, partId, uploadSlotId }: DownloadNewUploadSlotFileRequestDTO): Promise<ResultType<DownloadNewUploadSlotFileResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      const uploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: {
          uploadSlotId: uploadSlotIdBin,
          newPart: {
            partId: partIdBin,
            newAssignment: {
              assignmentId: assignmentIdBin,
              newUnit: {
                unitId: unitIdBin,
                enrollment: { studentId, courseId, course: { enabled: true } },
              },
            },
          },
        },
        include: { mimeType: true },
      });

      if (!uploadSlot) {
        return Result.fail(new DownloadNewUploadSlotFileNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      // read the file
      let fileData: Buffer;
      const path = this.configService.config.paths.assignmentsPath + '/upload-slots/' + this.uuidService.binToUUID(uploadSlot.uploadSlotId);
      try {
        fileData = await this.fileService.readFile(path);
      } catch (err) {
        this.logger.error('Could not read file', err);
        return Result.fail(new DownloadNewUploadSlotFileReadError());
      }

      const data = uploadSlot.mimeType?.compress ? await this.compressionService.gunzip(fileData) : fileData;
      return Result.success({
        data,
        filename: this.sanitizerService.sanitizeFilename(uploadSlot.filename ?? 'unknown'),
        size: data.length,
        mimeType: uploadSlot.mimeTypeId ?? 'application/octet-stream',
      });

    } catch (err) {
      this.logger.error('error downloading upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
