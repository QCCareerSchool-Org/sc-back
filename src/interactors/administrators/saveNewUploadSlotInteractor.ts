import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewUploadSlotDTO } from '../../domain/administrators/newUploadSlotDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewUploadSlotRequestDTO = {
  /** uuid */
  uploadSlotId: string;
  markOverride: number | null;
};

export type SaveNewUploadSlotResponseDTO = NewUploadSlotDTO;

abstract class SaveNewUploadSlotError extends Error { }
export class SaveNewUploadSlotNotFound extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotSubmissionNotSubmitted extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotSubmissionSkipped extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotSubmissionNotClosed extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotMarkOverrideOutOfRange extends SaveNewUploadSlotError { }

export class SaveNewUploadSlotInteractor implements IInteractor<SaveNewUploadSlotRequestDTO, SaveNewUploadSlotResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewUploadSlotRequestDTO): Promise<ResultType<SaveNewUploadSlotResponseDTO>> {
    try {
      const uploadSlotIdBin = this.uuidService.uuidToBin(request.uploadSlotId);

      const uploadSlot = await this.prisma.newUploadSlot.findUnique({
        where: { uploadSlotId: uploadSlotIdBin },
        include: {
          newPart: { include: { newAssignment: { include: { newSubmission: true } } } },
        },
      });
      if (!uploadSlot) {
        return failure(new SaveNewUploadSlotNotFound());
      }

      // submission must be submitted and can't be skipped
      if (!uploadSlot.newPart.newAssignment.newSubmission.submitted || (uploadSlot.newPart.newAssignment.newSubmission.submitted && uploadSlot.newPart.newAssignment.newSubmission.skipped)) {
        return failure(new SaveNewUploadSlotSubmissionNotSubmitted());
      }

      // submission must be closed
      if (!uploadSlot.newPart.newAssignment.newSubmission.closed) {
        return failure(new SaveNewUploadSlotSubmissionNotClosed());
      }

      // validate the data
      if (request.markOverride !== null) {
        if (request.markOverride < 0 || request.markOverride > uploadSlot.points) {
          return failure(new SaveNewUploadSlotMarkOverrideOutOfRange());
        }
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedUploadSlot = await this.prisma.newUploadSlot.update({
        data: {
          markOverride: request.markOverride,
          modified: prismaNow,
        },
        where: { uploadSlotId: uploadSlotIdBin },
      });

      return success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.mark,
        markOverride: updatedUploadSlot.markOverride,
        notes: updatedUploadSlot.notes,
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        filename: updatedUploadSlot.filename,
        filesize: updatedUploadSlot.filesize,
        mimeTypeId: updatedUploadSlot.mimeTypeId,
        complete: updatedUploadSlot.filename !== null,
        created: this.dateService.fixPrismaReadDate(updatedUploadSlot.created),
        modified: this.dateService.fixPrismaReadDate(updatedUploadSlot.modified),
      });

    } catch (err) {
      this.logger.error('error updating upload slot', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
