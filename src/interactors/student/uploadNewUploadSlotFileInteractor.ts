import { PrismaClient } from '@prisma/client';

import { IInteractor, InteractorFile } from '..';
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

export type UploadNewUploadSlotFileResponseDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
};

export class UploadNewUploadSlotFileNotFound extends Error { }
export class UploadNewUploadSlotFileTooLarge extends Error { }
export class UploadNewUploadSlotFileInvalidType extends Error { }
export class UploadNewUploadSlotFileSaveError extends Error { }
export class UploadNewUploadSlotFileEntityNotFound extends Error { }

/**
 * When uploading a new file, we'll recheck the part, assignment, and unit to
 * see if they're complete and update them as well. We could avoid the extra
 * work here, and recalculate the `complete` status of units, and assignments
 * when needed, but then we'd have to check every text box and upload slot of
 * every part of every assignment each time we wanted to retrieve a unit.
 */
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
      });

      if (!uploadSlot) {
        return Result.fail(new UploadNewUploadSlotFileNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

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
            complete: true,
          },
          where: { uploadSlotId: uploadSlotIdBin },
        });

        // retrieve the parent unit and all of its assignments, parts, text boxes, and upload slots
        const unit = await transaction.newUnit.findUnique({
          where: { unitId: unitIdBin },
          include: { assignments: { include: { parts: { include: { textBoxes: true, uploadSlots: true } } } } },
        });
        if (!unit) {
          throw new UploadNewUploadSlotFileEntityNotFound();
        }

        const assignment = unit.assignments.find(a => Buffer.compare(a.assignmentId, assignmentIdBin) === 0);
        if (!assignment) {
          throw new UploadNewUploadSlotFileEntityNotFound();
        }

        const part = assignment.parts.find(p => Buffer.compare(p.partId, partIdBin) === 0);
        if (!part) {
          throw new UploadNewUploadSlotFileEntityNotFound();
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
