import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { NewTextBoxDTO } from '../../domain/tutors/newTextBoxDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewTextBoxRequestDTO = {
  tutorId: number;
  textBoxId: string;
  mark: number | null;
  notes: string | null;
};

export type SaveNewTextBoxResponseDTO = NewTextBoxDTO;

abstract class SaveNewTextBoxError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveNewTextBoxNotFound extends SaveNewTextBoxError { }
export class SaveNewTextBoxSubmissionNotSubmitted extends SaveNewTextBoxError { }
export class SaveNewTextBoxSubmissionSkipped extends SaveNewTextBoxError { }
export class SaveNewTextBoxSubmissionAlreadyClosed extends SaveNewTextBoxError { }
export class SaveNewTextBoxWrongTutor extends SaveNewTextBoxError { }
export class SaveNewTextBoxAlreadyReturned extends SaveNewTextBoxError { }
export class SaveNewTextBoxIncomplete extends SaveNewTextBoxError { }
export class SaveNewTextBoxZeroPoints extends SaveNewTextBoxError { }
export class SaveNewTextBoxMarkLessThanZero extends SaveNewTextBoxError { }
export class SaveNewTextBoxMarkTooHigh extends SaveNewTextBoxError { public constructor(public maxMark: number) { super(); } }
export class SaveNewTextBoxNotesTooLong extends SaveNewTextBoxError { }

export class SaveNewTextBoxInteractor implements IInteractor<SaveNewTextBoxRequestDTO, SaveNewTextBoxResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewTextBoxRequestDTO): Promise<ResultType<SaveNewTextBoxResponseDTO>> {
    try {
      const { tutorId, mark, notes } = request;
      const textBoxIdBin = this.uuidService.uuidToBin(request.textBoxId);

      const newTextBox = await this.prisma.newTextBox.findFirst({
        where: { textBoxId: textBoxIdBin },
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
      if (!newTextBox) {
        throw new SaveNewTextBoxNotFound();
      }

      if (!newTextBox.newPart.newAssignment.newSubmission.submitted) {
        throw new SaveNewTextBoxSubmissionNotSubmitted();
      }

      if (newTextBox.newPart.newAssignment.newSubmission.skipped) {
        throw new SaveNewTextBoxSubmissionSkipped();
      }

      if (newTextBox.newPart.newAssignment.newSubmission.closed) {
        return failure(new SaveNewTextBoxSubmissionAlreadyClosed());
      }

      if (newTextBox.newPart.newAssignment.newSubmission.tutorId !== tutorId) {
        return failure(new SaveNewTextBoxWrongTutor());
      }

      if (newTextBox.newPart.newAssignment.newSubmission.tutorComment) {
        return failure(new SaveNewTextBoxAlreadyReturned());
      }

      if (newTextBox.text.length === 0) {
        return failure(new SaveNewTextBoxIncomplete());
      }

      if (mark !== null) {
        if (newTextBox.points === 0) {
          return failure(new SaveNewTextBoxZeroPoints());
        }
        if (mark < 0) {
          throw new SaveNewTextBoxMarkLessThanZero();
        }
        if (mark > newTextBox.points) {
          throw new SaveNewTextBoxMarkTooHigh(newTextBox.points);
        }
      }

      if (notes !== null) {
        const maxLength = 65_535;
        const length = [ ...notes ].length;
        if (length > maxLength) {
          throw new SaveNewTextBoxNotesTooLong();
        }
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: { mark, notes: notes?.length ? notes : null, modified: prismaNow },
        where: { textBoxId: textBoxIdBin },
      });

      return success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        points: updatedTextBox.points,
        mark: updatedTextBox.mark,
        notes: updatedTextBox.notes,
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        text: updatedTextBox.text,
        complete: updatedTextBox.text.length > 0,
        created: this.dateService.fixPrismaReadDate(updatedTextBox.created),
        modified: this.dateService.fixPrismaReadDate(updatedTextBox.modified),
      });

    } catch (err) {
      this.logger.error('error saving text box mark', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
