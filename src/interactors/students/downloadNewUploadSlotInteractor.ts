import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFileStream } from '..';
import type { ICompressionService } from '../../services/compression';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { ISanitizerService } from '../../services/sanitizer';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type DownloadNewUploadSlotRequestDTO = {
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

export type DownloadNewUploadSlotResponseDTO = InteractorFileStream;

export class DownloadNewUploadSlotNotFound extends Error { }
export class DownloadNewUploadSlotFileNotFound extends Error { }
export class DownloadNewUploadSlotFileReadError extends Error { }

export class DownloadNewUploadSlotInteractor implements IInteractor<DownloadNewUploadSlotRequestDTO, DownloadNewUploadSlotResponseDTO> {
  private static readonly maxAge = 300;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId, partId, uploadSlotId }: DownloadNewUploadSlotRequestDTO): Promise<ResultType<DownloadNewUploadSlotResponseDTO>> {
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
      });

      if (!uploadSlot) {
        return Result.fail(new DownloadNewUploadSlotNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      const paddedStudentId = studentId.toString().padStart(8, '0');
      const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${this.uuidService.binToUUID(uploadSlot.uploadSlotId)}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return Result.fail(new DownloadNewUploadSlotFileNotFound(filePath));
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error('Could not read file', err);
        return Result.fail(new DownloadNewUploadSlotFileReadError(filePath));
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(uploadSlot.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: uploadSlot.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewUploadSlotInteractor.maxAge,
        contentEncoding: uploadSlot.compressed ? 'gzip' : undefined,
      });

    } catch (err) {
      this.logger.error('error downloading upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
