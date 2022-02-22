import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { IConfigService } from '../../services/config';
import { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type DeleteNewUploadSlotFileRequestDTO = {
  studentId: number;
  /** hex string */
  unitId: string;
  /** hex string */
  assignmentId: string;
  /** hex string */
  partId: string;
  /** hex string */
  uploadSlotId: string;
};

export type DeleteNewUploadSlotFileResponseDTO = {
  /** hex string */
  uploadSlotId: string;
  /** hex string */
  partId: string;
};

export class DeleteNewUploadSlotFileNotFound extends Error { }
export class DeleteNewUploadSlotFileUnlinkError extends Error { }
export class DeleteNewUploadSlotFileEntityNotFound extends Error { }

export class DeleteNewUploadSlotFileInteractor implements IInteractor<DeleteNewUploadSlotFileRequestDTO, DeleteNewUploadSlotFileResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId, assignmentId, partId, uploadSlotId }: DeleteNewUploadSlotFileRequestDTO): Promise<ResultType<DeleteNewUploadSlotFileResponseDTO>> {
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
      });

      if (!uploadSlot) {
        return Result.fail(new DeleteNewUploadSlotFileNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      const data = await this.prisma.$transaction(async transaction => {
        // update the upload slot
        const updatedUploadSlot = await transaction.newUploadSlot.update({
          data: {
            filename: null,
            size: null,
            mimeTypeId: null,
            complete: false,
          },
          where: { uploadSlotId: uploadSlotIdBin },
        });

        // delete the file
        const path = this.configService.config.paths.assignmentsPath + '/upload-slots/' + this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId);
        try {
          await this.fileService.unlink(path);
        } catch (err) {
          console.log(err);
          throw new DeleteNewUploadSlotFileUnlinkError();
        }

        // retrieve the parent unit and all of its assignments, parts, text boxes, and upload slots
        const unit = await transaction.newUnit.findUnique({
          where: { unitId: unitIdBin },
          include: { assignments: { include: { parts: { include: { textBoxes: true, uploadSlots: true } } } } },
        });
        if (!unit) {
          throw new DeleteNewUploadSlotFileEntityNotFound();
        }

        const assignment = unit.assignments.find(a => Buffer.compare(a.assignmentId, assignmentIdBin) === 0);
        if (!assignment) {
          throw new DeleteNewUploadSlotFileEntityNotFound();
        }

        const part = assignment.parts.find(p => Buffer.compare(p.partId, partIdBin) === 0);
        if (!part) {
          throw new DeleteNewUploadSlotFileEntityNotFound();
        }

        const textBoxesComplete = part.textBoxes.filter(t => !t.optional).every(t => t.complete);
        const uploadSlotsComplete = part.uploadSlots.filter(u => !u.optional).every(u => u.complete);
        const partComplete = textBoxesComplete && uploadSlotsComplete;

        const otherPartsComplete = assignment.parts
          .filter(p => Buffer.compare(p.partId, partIdBin) !== 0)
          .filter(p => !p.optional)
          .every(p => p.complete);
        const assignmentComplete = (partComplete || part.optional) && otherPartsComplete;

        const otherAssignmentsComplete = unit.assignments
          .filter(a => Buffer.compare(a.assignmentId, assignmentIdBin) !== 0)
          .filter(a => !a.optional)
          .every(a => a.complete);
        const unitComplete = (assignmentComplete || assignment.optional) && otherAssignmentsComplete;

        await transaction.newUnit.update({
          where: { unitId: unitIdBin },
          data: {
            complete: unitComplete,
            assignments: {
              update: {
                where: { assignmentId: assignmentIdBin },
                data: {
                  complete: assignmentComplete,
                  parts: {
                    update: {
                      where: { partId: partIdBin },
                      data: { complete: partComplete },
                    },
                  },
                },
              },
            },
          },
        });

        // return the upload slot from the beginning of the transaction
        return updatedUploadSlot;
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(data.uploadSlotId),
        partId: this.uuidService.binToUUID(data.partId),
      });

    } catch (err) {
      this.logger.error('error deleting upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
