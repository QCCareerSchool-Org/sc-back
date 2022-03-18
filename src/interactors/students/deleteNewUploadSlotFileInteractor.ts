import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUploadSlotDTO } from '../../domain/newUploadSlotDTO';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type DeleteNewUploadSlotFileRequestDTO = {
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

export type DeleteNewUploadSlotFileResponseDTO = NewUploadSlotDTO;

export class DeleteNewUploadSlotFileNotFound extends Error { }
export class DeleteNewUploadSlotFileUnitSubmitted extends Error { }
export class DeleteNewUploadSlotFileUnitSkipped extends Error { }
export class DeleteNewUploadSlotFileUnlinkError extends Error { }

export class DeleteNewUploadSlotFileInteractor implements IInteractor<DeleteNewUploadSlotFileRequestDTO, DeleteNewUploadSlotFileResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId, partId, uploadSlotId }: DeleteNewUploadSlotFileRequestDTO): Promise<ResultType<DeleteNewUploadSlotFileResponseDTO>> {
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
        return Result.fail(new DeleteNewUploadSlotFileNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and uploadSlotId

      if (uploadSlot.newPart.newAssignment.newUnit.submitted) {
        return Result.fail(new DeleteNewUploadSlotFileUnitSubmitted());
      }

      if (uploadSlot.newPart.newAssignment.newUnit.skipped) {
        return Result.fail(new DeleteNewUploadSlotFileUnitSkipped());
      }

      const data = await this.prisma.$transaction(async transaction => {
        // update the upload slot
        const updatedUploadSlot = await transaction.newUploadSlot.update({
          data: {
            filename: null,
            size: null,
            mimeTypeId: null,
          },
          where: { uploadSlotId: uploadSlotIdBin },
        });

        // delete the file
        const paddedStudentId = studentId.toString().padStart(8, '0');
        const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId)}`;
        try {
          await this.fileService.unlink(filePath);
        } catch (err) {
          this.logger.error('Could not delete file', err);
          throw new DeleteNewUploadSlotFileUnlinkError(filePath);
        }

        // return the upload slot from the beginning of the transaction
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
      this.logger.error('error deleting upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
