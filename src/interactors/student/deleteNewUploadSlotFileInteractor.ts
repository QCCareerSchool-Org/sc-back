import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { NewUploadSlotDTO } from '../../domain/student/newUploadSlotDTO';
import { IConfigService } from '../../services/config';
import { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

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
          part: {
            partId: partIdBin,
            assignment: {
              assignmentId: assignmentIdBin,
              unit: {
                unitId: unitIdBin,
                enrollment: { studentId, courseId, course: { enabled: true } },
              },
            },
          },
        },
        include: { part: { include: { assignment: { include: { unit: true } } } } },
      });

      if (!uploadSlot) {
        return Result.fail(new DeleteNewUploadSlotFileNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      if (uploadSlot.part.assignment.unit.submitted) {
        return Result.fail(new DeleteNewUploadSlotFileUnitSubmitted());
      }

      if (uploadSlot.part.assignment.unit.skipped) {
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
        const path = this.configService.config.paths.assignmentsPath + '/upload-slots/' + this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId);
        try {
          await this.fileService.unlink(path);
        } catch (err) {
          this.logger.error('Could not delete file', err);
          throw new DeleteNewUploadSlotFileUnlinkError();
        }

        // return the upload slot from the beginning of the transaction
        return updatedUploadSlot;
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(data.uploadSlotId),
        partId: this.uuidService.binToUUID(data.partId),
        label: data.label,
        allowedTypes: data.allowedTypes.split(','),
        points: data.points,
        mark: uploadSlot.part.assignment.unit.marked ? data.mark : null, // hide mark unless the unit is marked
        optional: data.optional,
        order: data.order,
        filename: data.filename,
        size: data.size,
        mimeTypeId: data.mimeTypeId,
        complete: data.filename !== null,
      });

    } catch (err) {
      this.logger.error('error deleting upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
