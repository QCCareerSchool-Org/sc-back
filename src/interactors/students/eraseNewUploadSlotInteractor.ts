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

export type EraseNewUploadSlotRequestDTO = {
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

export type EraseNewUploadSlotResponseDTO = NewUploadSlotDTO;

export class EraseNewUploadSlotNotFound extends Error { }
export class EraseNewUploadSlotUnitSubmitted extends Error { }
export class EraseNewUploadSlotUnlinkError extends Error { }

export class EraseNewUploadSlotInteractor implements IInteractor<EraseNewUploadSlotRequestDTO, EraseNewUploadSlotResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId, partId, uploadSlotId }: EraseNewUploadSlotRequestDTO): Promise<ResultType<EraseNewUploadSlotResponseDTO>> {
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
        throw new EraseNewUploadSlotNotFound();
      }

      if (newUploadSlot.newPart.newAssignment.newUnit.submitted) {
        throw new EraseNewUploadSlotUnitSubmitted();
      }

      const updatedUploadSlot = await this.prisma.$transaction(async transaction => {
        const updated = await transaction.newUploadSlot.update({
          data: {
            filename: null,
            filesize: null,
            mimeTypeId: null,
          },
          where: { uploadSlotId: uploadSlotIdBin },
          include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
        });

        // delete the file
        const paddedStudentId = studentId.toString().padStart(8, '0');
        const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${uploadSlotId}`;
        try {
          await this.fileService.unlink(filePath);
        } catch (err) {
          this.logger.error('Could not delete file', err);
          throw new EraseNewUploadSlotUnlinkError(filePath);
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
      this.logger.error('error deleting upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
