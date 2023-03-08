import type { PrismaClient } from '@prisma/client';

import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewUploadSlotDTO } from '../../domain/tutors/newUploadSlotDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type SaveNewUploadSlotRequestDTO = {
  tutorId: number;
  uploadSlotId: string;
  mark: number | null;
  notes: string | null;
};

export type SaveNewUploadSlotResponseDTO = NewUploadSlotDTO;

export class SaveNewUploadSlotNotFound extends Error { }
export class SaveNewUploadSlotSubmissionNotSubmitted extends Error { }
export class SaveNewUploadSlotSubmissionSkipped extends Error { }
export class SaveNewUploadSlotSubmissionAlreadyClosed extends Error { }
export class SaveNewUploadSlotWrongTutor extends Error { }
export class SaveNewUploadSlotAlreadyReturned extends Error { }
export class SaveNewUploadSlotIncomplete extends Error { }
export class SaveNewUploadSlotZeroPoints extends Error { }
export class SaveNewUploadSlotMarkLessThanZero extends Error { }
export class SaveNewUploadSlotMarkTooHigh extends Error { public constructor(public maxMark: number) { super(); } }
export class SaveNewUploadSlotNotesTooLong extends Error { }

export class SaveNewUploadSlotInteractor implements IInteractor<SaveNewUploadSlotRequestDTO, SaveNewUploadSlotResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewUploadSlotRequestDTO): Promise<ResultType<SaveNewUploadSlotResponseDTO>> {
    try {
      const { tutorId, mark, notes } = request;
      const uploadSlotIdBin = this.uuidService.uuidToBin(request.uploadSlotId);

      const newUploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: { uploadSlotId: uploadSlotIdBin },
        include: {
          newPart: {
            include: {
              newAssignment: {
                include: { newSubmission: true },
              },
            },
          },
        },
      });
      if (!newUploadSlot) {
        throw new SaveNewUploadSlotNotFound();
      }

      if (!newUploadSlot.newPart.newAssignment.newSubmission.submitted) {
        throw new SaveNewUploadSlotSubmissionNotSubmitted();
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.skipped) {
        throw new SaveNewUploadSlotSubmissionSkipped();
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.closed) {
        return Result.fail(new SaveNewUploadSlotSubmissionAlreadyClosed());
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.tutorId !== tutorId) {
        return Result.fail(new SaveNewUploadSlotWrongTutor());
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.tutorComment) {
        return Result.fail(new SaveNewUploadSlotAlreadyReturned());
      }

      if (newUploadSlot.filename === null) {
        return Result.fail(new SaveNewUploadSlotIncomplete());
      }

      if (mark !== null) {
        if (newUploadSlot.points === 0) {
          return Result.fail(new SaveNewUploadSlotZeroPoints());
        }
        if (mark < 0) {
          throw new SaveNewUploadSlotMarkLessThanZero();
        }
        if (mark > newUploadSlot.points) {
          throw new SaveNewUploadSlotMarkTooHigh(newUploadSlot.points);
        }
      }

      if (notes !== null) {
        const maxLength = 65_535;
        const length = [ ...notes ].length;
        if (length > maxLength) {
          throw new SaveNewUploadSlotNotesTooLong();
        }
      }

      const localDate = this.dateService.getLocalDate() + 'Z'; // TODO: Update if Prisma ever gets timezones working properly

      const updatedUploadSlot = await this.prisma.newUploadSlot.update({
        data: { mark, notes: notes?.length ? notes : null, modified: localDate },
        where: { uploadSlotId: uploadSlotIdBin },
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.mark,
        notes: updatedUploadSlot.notes,
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
      this.logger.error('error saving text box mark', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
