import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewUploadSlotDTO } from '../../domain/tutors/newUploadSlotDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewUploadSlotRequestDTO = {
  tutorId: number;
  uploadSlotId: string;
  mark: number | null;
  notes: string | null;
};

export type SaveNewUploadSlotResponseDTO = NewUploadSlotDTO;

abstract class SaveNewUploadSlotError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveNewUploadSlotNotFound extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotSubmissionNotSubmitted extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotSubmissionSkipped extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotSubmissionAlreadyClosed extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotWrongTutor extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotAlreadyReturned extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotIncomplete extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotZeroPoints extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotMarkLessThanZero extends SaveNewUploadSlotError { }
export class SaveNewUploadSlotMarkTooHigh extends SaveNewUploadSlotError { public constructor(public maxMark: number) { super(); } }
export class SaveNewUploadSlotNotesTooLong extends SaveNewUploadSlotError { }

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
        return failure(new SaveNewUploadSlotSubmissionAlreadyClosed());
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.tutorId !== tutorId) {
        return failure(new SaveNewUploadSlotWrongTutor());
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.tutorComment) {
        return failure(new SaveNewUploadSlotAlreadyReturned());
      }

      if (newUploadSlot.filename === null) {
        return failure(new SaveNewUploadSlotIncomplete());
      }

      if (mark !== null) {
        if (newUploadSlot.points === 0) {
          return failure(new SaveNewUploadSlotZeroPoints());
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

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedUploadSlot = await this.prisma.newUploadSlot.update({
        data: { mark, notes: notes?.length ? notes : null, modified: prismaNow },
        where: { uploadSlotId: uploadSlotIdBin },
      });

      return success({
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
        created: this.dateService.fixPrismaReadDate(updatedUploadSlot.created),
        modified: this.dateService.fixPrismaReadDate(updatedUploadSlot.modified),
      });

    } catch (err) {
      this.logger.error('error saving text box mark', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
