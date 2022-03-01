import { PrismaClient } from '@prisma/client';

import { IInteractor, InteractorFile } from '..';
import { NewUploadSlotDTO } from '../../domain/student/newUploadSlotDTO';
import { ICompressionService } from '../../services/compression';
import { IConfigService } from '../../services/config';
import { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type UploadNewUploadSlotFileRequestDTO = {
  studentId: number;
  /** uuid */
  unitId: string;
  /** uuid */
  assignmentId: string;
  /** uuid */
  partId: string;
  /** uuid */
  uploadSlotId: string;
  file: InteractorFile;
};

export type UploadNewUploadSlotFileResponseDTO = NewUploadSlotDTO;

export class UploadNewUploadSlotFileNotFound extends Error { }
export class UploadNewUploadSlotFileUnitSubmitted extends Error { }
export class UploadNewUploadSlotFileUnitSkipped extends Error { }
export class UploadNewUploadSlotFileTooLarge extends Error { }
export class UploadNewUploadSlotFileInvalidType extends Error { }
export class UploadNewUploadSlotFileEntityNotFound extends Error { }
export class UploadNewUploadSlotFileSaveError extends Error { }

export class UploadNewUploadSlotFileInteractor implements IInteractor<UploadNewUploadSlotFileRequestDTO, UploadNewUploadSlotFileResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly compressionService: ICompressionService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId, assignmentId, partId, uploadSlotId, file }: UploadNewUploadSlotFileRequestDTO): Promise<ResultType<UploadNewUploadSlotFileResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      const uploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: {
          uploadSlotId: uploadSlotIdBin,
          part: {
            partId: partIdBin,
            assignment: {
              assignmentId: assignmentIdBin,
              unit: {
                unitId: unitIdBin,
                enrollment: { studentId },
              },
            },
          },
        },
        include: { part: { include: { assignment: { include: { unit: true } } } } },
      });

      if (!uploadSlot) {
        return Result.fail(new UploadNewUploadSlotFileNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      if (uploadSlot.part.assignment.unit.submitted) {
        return Result.fail(new UploadNewUploadSlotFileUnitSubmitted());
      }

      if (uploadSlot.part.assignment.unit.skipped) {
        return Result.fail(new UploadNewUploadSlotFileUnitSkipped());
      }

      if (file.size > this.configService.config.uploadSlotMaxFilesize) {
        return Result.fail(new UploadNewUploadSlotFileTooLarge());
      }

      if (!this.allowedType(file.mimeType, uploadSlot.allowedTypes.split(','))) {
        return Result.fail(new UploadNewUploadSlotFileInvalidType());
      }

      const data = await this.prisma.$transaction(async transaction => {
        // look up the mime type
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: file.mimeType },
        });
        if (!mimeType) {
          this.logger.error(`Could not find mime type "${file.mimeType}"`);
          throw new UploadNewUploadSlotFileEntityNotFound();
        }

        // update the upload slot
        const updatedUploadSlot = await transaction.newUploadSlot.update({
          data: {
            filename: file.filename,
            size: file.size,
            mimeTypeId: mimeType.mimeTypeId,
          },
          where: { uploadSlotId: uploadSlotIdBin },
        });

        // save the file
        const path = this.configService.config.paths.assignmentsPath + '/upload-slots/' + this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId);
        try {
          if (mimeType.compress) {
            await this.fileService.writeFile(path, await this.compressionService.gzip(file.data));
          } else {
            await this.fileService.writeFile(path, file.data);
          }
        } catch (err) {
          this.logger.error('Could not save file', err);
          throw new UploadNewUploadSlotFileSaveError();
        }

        // return the upload slot from the start of the transaction
        return updatedUploadSlot;
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(data.uploadSlotId),
        partId: this.uuidService.binToUUID(data.partId),
        label: data.label,
        allowedTypes: data.allowedTypes.split(','),
        optional: data.optional,
        order: data.order,
        filename: data.filename,
        size: data.size,
        mimeTypeId: data.mimeTypeId,
        complete: data.filename !== null,
      });

    } catch (err) {
      this.logger.error('error uploading upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private allowedType(mimeType: string, allowedTypes: string[]): boolean {
    for (const allowedType of allowedTypes) {
      if (allowedType === 'image') {
        if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/x-png' || mimeType === 'image/bmp' || mimeType === 'image/gif') {
          return true;
        }
      } else if (allowedType === 'pdf') {
        if (mimeType === 'application/pdf') {
          return true;
        }
      } else if (allowedType === 'Word document') {
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          return true;
        }
      } else if (allowedType === 'Excel spreadsheet') {
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
          return true;
        }
      }
    }
    return false;
  }
}
