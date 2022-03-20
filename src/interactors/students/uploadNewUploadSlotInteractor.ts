import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
import { attemptOCCTransaction } from '../../attemptOCCTransaction';
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

      const updatedUploadSlot = await attemptOCCTransaction(async () => {
        const newUnit = await this.prisma.newUnit.findFirst({
          where: { unitId: unitIdBin, enrollment: { studentId, courseId, course: { enabled: true } } },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });
        if (!newUnit) {
          throw new UploadNewUploadSlotNotFound();
        }

        if (newUnit.submitted) {
          throw new UploadNewUploadSlotUnitSubmitted();
        }

        if (newUnit.skipped) {
          throw new UploadNewUploadSlotUnitSkipped();
        }

        const newAssignment = newUnit.newAssignments.find(a => a.assignmentId.compare(assignmentIdBin) === 0);
        if (!newAssignment) {
          throw new UploadNewUploadSlotNotFound();
        }

        const newPart = newAssignment.newParts.find(p => p.partId.compare(partIdBin) === 0);
        if (!newPart) {
          throw new UploadNewUploadSlotNotFound();
        }

        const newUploadSlot = newPart.newUploadSlots.find(u => u.uploadSlotId.compare(uploadSlotIdBin) === 0);
        if (!newUploadSlot) {
          throw new UploadNewUploadSlotNotFound();
        }

        if (file.size > this.configService.config.uploadSlotMaxFilesize) {
          throw new UploadNewUploadSlotFileTooLarge();
        }

        if (!this.allowedType(file.mimeType, newUploadSlot.allowedTypes.split(','))) {
          throw new UploadNewUploadSlotInvalidFileType();
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
        const uploadSlotComplete = true;

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
                  if (u.uploadSlotId.compare(uploadSlotIdBin) === 0) {
                    if (!uploadSlotComplete && !u.optional) { // this upload slot
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
            // ignore incomplete, optional assignments
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
              size: file.size,
              mimeTypeId: mimeType.mimeTypeId,
              compressed: mimeType.compress,
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
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.newPart.newAssignment.newUnit.marked ? updatedUploadSlot.mark : null, // hide mark unless the unit is marked
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        filename: updatedUploadSlot.filename,
        size: updatedUploadSlot.size,
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
