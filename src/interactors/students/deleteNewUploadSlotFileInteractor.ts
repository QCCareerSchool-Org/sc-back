import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import { attemptOCCTransaction } from '../../attemptOCCTransaction';
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

      const updatedUploadSlot = await attemptOCCTransaction(async () => {
        const newUnit = await this.prisma.newUnit.findFirst({
          where: { unitId: unitIdBin, enrollment: { studentId, courseId, course: { enabled: true } } },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });
        if (!newUnit) {
          throw new DeleteNewUploadSlotFileNotFound();
        }

        if (newUnit.submitted) {
          throw new DeleteNewUploadSlotFileUnitSubmitted();
        }

        if (newUnit.skipped) {
          throw new DeleteNewUploadSlotFileUnitSkipped();
        }

        const newAssignment = newUnit.newAssignments.find(a => a.assignmentId.compare(assignmentIdBin) === 0);
        if (!newAssignment) {
          throw new DeleteNewUploadSlotFileNotFound();
        }

        const newPart = newAssignment.newParts.find(p => p.partId.compare(partIdBin) === 0);
        if (!newPart) {
          throw new DeleteNewUploadSlotFileNotFound();
        }

        const newUploadSlot = newPart.newUploadSlots.find(u => u.uploadSlotId.compare(uploadSlotIdBin) === 0);
        if (!newUploadSlot) {
          throw new DeleteNewUploadSlotFileNotFound();
        }

        let unitComplete = true;
        let unitMarked = true;
        let unitPoints = 0;
        let unitMark = 0;
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        let partComplete = true;
        let partMarked = true;
        let partPoints = 0;
        let partMark = 0;
        const uploadSlotComplete = false;

        for (const a of newUnit.newAssignments) {
          if (a.assignmentId.compare(assignmentIdBin) === 0) { // this assignment
            for (const p of a.newParts) {
              if (p.partId.compare(partIdBin) === 0) { // this part
                for (const t of p.newTextBoxes) {
                  if (!t.complete && !t.optional) {
                    partComplete = false;
                  }
                  // ignore incomplete, optional inputs
                  if (t.complete || !t.optional) {
                    if (t.mark === null) {
                      partMarked = false;
                    }
                    partPoints += t.points;
                    partMark += t.mark ?? 0;
                  }
                }
                for (const u of p.newUploadSlots) {
                  if (u.uploadSlotId.compare(uploadSlotIdBin) === 0) { // this upload slot
                    if (!uploadSlotComplete && !u.optional) {
                      partComplete = false;
                    }
                    // ignore incomplete, optional inputs
                    if (uploadSlotComplete || !u.optional) {
                      if (u.mark === null) {
                        partMarked = false;
                      }
                      partPoints += u.points;
                      partMark += u.mark ?? 0;
                    }
                  } else { // other upload slots
                    if (!u.complete && !u.optional) {
                      partComplete = false;
                    }
                    // ignore incomplete, optional inputs
                    if (u.complete || !u.optional) {
                      if (u.mark === null) {
                        partMarked = false;
                      }
                      partPoints += u.points;
                      partMark += u.mark ?? 0;
                    }
                  }
                }
                if (!partComplete) {
                  assignmentComplete = false;
                }
                if (!partMarked) {
                  assignmentMarked = false;
                }
                assignmentPoints += partPoints;
                assignmentMark += partMark;
              } else { // other parts
                if (!p.complete) {
                  assignmentComplete = false;
                }
                if (p.mark === null) {
                  assignmentMarked = false;
                }
                assignmentPoints += p.points;
                assignmentMark += p.mark ?? 0;
              }
            }
            if (!assignmentComplete && !a.optional) {
              unitComplete = false;
            }
            // ignore incomplete, optional assignments
            if (assignmentComplete || !a.optional) {
              if (!assignmentMarked) {
                unitMarked = false;
              }
              unitPoints += assignmentPoints;
              unitMark += assignmentMark;
            }
          } else { // other assignments
            if (!a.complete && !a.optional) {
              unitComplete = false;
            }
            if (a.complete || !a.optional) {
              if (a.mark === null) {
                unitMarked = false;
              }
              unitPoints += a.points;
              unitMark += a.mark ?? 0;
            }
          }
        }

        await this.prisma.$executeRaw`SET TRANSACTION ISOLATION LEVEL READ COMMITTED`;

        return this.prisma.$transaction(async transaction => {
          const updated = await transaction.newUploadSlot.update({
            data: {
              filename: null,
              size: null,
              mimeTypeId: null,
              complete: uploadSlotComplete,
            },
            where: { uploadSlotId: uploadSlotIdBin },
            include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
          });

          await transaction.newPart.update({
            data: {
              complete: partComplete,
              points: partPoints,
              mark: partMarked ? partMark : null,
            },
            where: { partId: partIdBin },
          });

          await transaction.newAssignment.update({
            data: {
              complete: assignmentComplete,
              points: assignmentPoints,
              mark: assignmentMarked ? assignmentMark : null,
            },
            where: { assignmentId: assignmentIdBin },
          });

          const batchPayload = await transaction.newUnit.updateMany({
            data: {
              complete: unitComplete,
              points: unitPoints,
              mark: unitMarked ? unitMark : null,
              entityVersion: { increment: 1 },
            },
            where: { unitId: unitIdBin, entityVersion: newUnit.entityVersion },
          });

          if (batchPayload.count === 0) {
            return false;
          }

          // delete the file
          const paddedStudentId = studentId.toString().padStart(8, '0');
          const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${uploadSlotId}`;
          try {
            await this.fileService.unlink(filePath);
          } catch (err) {
            this.logger.error('Could not delete file', err);
            throw new DeleteNewUploadSlotFileUnlinkError(filePath);
          }

          return updated;
        });
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        filename: updatedUploadSlot.filename,
        size: updatedUploadSlot.size,
        mimeTypeId: updatedUploadSlot.mimeTypeId,
        complete: updatedUploadSlot.complete,
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.newPart.newAssignment.newUnit.marked ? updatedUploadSlot.mark : null, // hide mark unless the unit is marked
        created: updatedUploadSlot.created,
        modified: updatedUploadSlot.modified,
      });

    } catch (err) {
      this.logger.error('error deleting upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
