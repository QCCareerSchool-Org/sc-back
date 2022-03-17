import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
import type { NewUploadSlotDTO } from '../../domain/newUploadSlotDTO';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import type { ICompressionService } from '../../services/compression';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type UploadNewUploadSlotRequestDTO = {
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
  file: InteractorFile;
};

export type UploadNewUploadSlotResponseDTO = NewUploadSlotDTO;

export class UploadNewUploadSlotNotFound extends Error { }
export class UploadNewUploadSlotUnitSubmitted extends Error { }
export class UploadNewUploadSlotUnitSkipped extends Error { }
export class UploadNewUploadSlotFileTooLarge extends Error { }
export class UploadNewUploadSlotInvalidFileType extends Error { }
export class UploadNewUploadSlotEntityNotFound extends Error { }
export class UploadNewUploadSlotCouldNotCreateDirectory extends Error { }
export class UploadNewUploadSlotSaveError extends Error { }

export class UploadNewUploadSlotInteractor implements IInteractor<UploadNewUploadSlotRequestDTO, UploadNewUploadSlotResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly compressionService: ICompressionService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId, partId, uploadSlotId, file }: UploadNewUploadSlotRequestDTO): Promise<ResultType<UploadNewUploadSlotResponseDTO>> {
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
        include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
      });

      if (!uploadSlot) {
        return Result.fail(new UploadNewUploadSlotNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      if (uploadSlot.newPart.newAssignment.newUnit.submitted) {
        return Result.fail(new UploadNewUploadSlotUnitSubmitted());
      }

      if (uploadSlot.newPart.newAssignment.newUnit.skipped) {
        return Result.fail(new UploadNewUploadSlotUnitSkipped());
      }

      if (file.size > this.configService.config.uploadSlotMaxFilesize) {
        return Result.fail(new UploadNewUploadSlotFileTooLarge());
      }

      if (!this.allowedType(file.mimeType, uploadSlot.allowedTypes.split(','))) {
        return Result.fail(new UploadNewUploadSlotInvalidFileType());
      }

      const data = await this.prisma.$transaction(async transaction => {
        // look up the mime type
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: file.mimeType },
        });
        if (!mimeType) {
          this.logger.error(`Could not find mime type "${file.mimeType}"`);
          throw new UploadNewUploadSlotEntityNotFound();
        }

        // update the upload slot
        const updatedUploadSlot = await transaction.newUploadSlot.update({
          data: {
            filename: file.filename,
            size: file.size,
            mimeTypeId: mimeType.mimeTypeId,
            compressed: mimeType.compress,
          },
          where: { uploadSlotId: uploadSlotIdBin },
        });

        const paddedStudentId = studentId.toString().padStart(8, '0');

        const partialPath1 = this.configService.config.paths.assignmentsPath;
        try {
          if (!await this.fileService.stat(partialPath1)) {
            await this.fileService.mkdir(partialPath1);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUploadSlotCouldNotCreateDirectory(partialPath1);
        }

        const partialPath2 = `${partialPath1}/${paddedStudentId.substring(0, 4)}`;
        try {
          if (!await this.fileService.stat(partialPath2)) {
            await this.fileService.mkdir(partialPath2);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUploadSlotCouldNotCreateDirectory(partialPath2);
        }

        const partialPath3 = `${partialPath2}/${paddedStudentId.substring(4, 8)}`;
        try {
          if (!await this.fileService.stat(partialPath3)) {
            await this.fileService.mkdir(partialPath3);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUploadSlotCouldNotCreateDirectory(partialPath3);
        }

        // save the file
        const filePath = `${partialPath3}/${this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId)}`;
        try {
          if (mimeType.compress) {
            await this.fileService.writeFile(filePath, await this.compressionService.gzip(file.data));
          } else {
            await this.fileService.writeFile(filePath, file.data);
          }
        } catch (err) {
          this.logger.error('Could not save file', err);
          throw new UploadNewUploadSlotSaveError();
        }

        // return the upload slot from the start of the transaction
        return updatedUploadSlot;
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(data.uploadSlotId),
        partId: this.uuidService.binToUUID(data.partId),
        label: data.label,
        allowedTypes: data.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: data.points,
        mark: uploadSlot.newPart.newAssignment.newUnit.marked ? data.mark : null, // hide mark unless the unit is marked
        optional: data.optional,
        order: data.order,
        filename: data.filename,
        size: data.size,
        mimeTypeId: data.mimeTypeId,
        complete: data.filename !== null,
        created: data.created,
        modified: data.modified,
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
      } else if (allowedType === 'word') {
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          return true;
        }
      } else if (allowedType === 'excel') {
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
          return true;
        }
      }
    }
    return false;
  }
}
