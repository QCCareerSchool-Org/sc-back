import type { PrismaClient } from '@prisma/client';

import type { NewUploadSlotDTO } from '../../domain/newUploadSlotDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { ICompressionService } from '../../services/compression/index.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileMemoryUpload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

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
  file: InteractorFileMemoryUpload;
};

export type UploadNewUploadSlotResponseDTO = NewUploadSlotDTO;

export class UploadNewUploadSlotNotFound extends Error { }
export class UploadNewUploadSlotUnitSubmitted extends Error { }
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

      const newUploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: { uploadSlotId: uploadSlotIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, enrollment: { studentId, courseId, course: { enabled: true } } } } } },
        include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
      });
      if (!newUploadSlot) {
        throw new UploadNewUploadSlotNotFound();
      }

      if (newUploadSlot.newPart.newAssignment.newUnit.submitted) {
        throw new UploadNewUploadSlotUnitSubmitted();
      }

      if (file.size > this.configService.config.uploadSlotMaxFilesize) {
        throw new UploadNewUploadSlotFileTooLarge();
      }

      if (!this.allowedType(file.mimeType, newUploadSlot.allowedTypes.split(','))) {
        throw new UploadNewUploadSlotInvalidFileType();
      }

      const updatedUploadSlot = await this.prisma.$transaction(async transaction => {
        // look up the mime type
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: file.mimeType },
        });
        if (!mimeType) {
          this.logger.error(`Could not find mime type "${file.mimeType}"`);
          throw new UploadNewUploadSlotEntityNotFound();
        }

        const updated = await transaction.newUploadSlot.update({
          data: {
            filename: file.filename,
            filesize: file.size,
            mimeTypeId: mimeType.mimeTypeId,
            compressed: mimeType.compress,
          },
          where: { uploadSlotId: uploadSlotIdBin },
          include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
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
        const filePath = `${partialPath3}/${uploadSlotId}`;
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

        return updated;
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.newPart.newAssignment.newUnit.closed ? updatedUploadSlot.mark : null, // hide mark unless the unit is marked
        notes: null, // students should never see the tutor's notes
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        filename: updatedUploadSlot.filename,
        filesize: updatedUploadSlot.filesize,
        mimeTypeId: updatedUploadSlot.mimeTypeId,
        complete: updatedUploadSlot.filename !== null,
        created: updatedUploadSlot.created,
        modified: updatedUploadSlot.modified,
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
