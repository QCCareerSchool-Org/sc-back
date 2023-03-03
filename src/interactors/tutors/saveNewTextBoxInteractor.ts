import type { PrismaClient } from '@prisma/client';

import type { NewTextBoxDTO } from '../../domain/tutors/newTextBoxDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type SaveNewTextBoxRequestDTO = {
  tutorId: number;
  textBoxId: string;
  mark: number | null;
  notes: string | null;
};

export type SaveNewTextBoxResponseDTO = NewTextBoxDTO;

export class SaveNewTextBoxNotFound extends Error { }
export class SaveNewTextBoxSubmissionNotSubmitted extends Error { }
export class SaveNewTextBoxSubmissionSkipped extends Error { }
export class SaveNewTextBoxSubmissionAlreadyClosed extends Error { }
export class SaveNewTextBoxWrongTutor extends Error { }
export class SaveNewTextBoxAlreadyReturned extends Error { }
export class SaveNewTextBoxIncomplete extends Error { }
export class SaveNewTextBoxZeroPoints extends Error { }
export class SaveNewTextBoxMarkLessThanZero extends Error { }
export class SaveNewTextBoxMarkTooHigh extends Error { public constructor(public maxMark: number) { super(); } }
export class SaveNewTextBoxNotesTooLong extends Error { }

export class SaveNewTextBoxInteractor implements IInteractor<SaveNewTextBoxRequestDTO, SaveNewTextBoxResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
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
        return Result.fail(new SaveNewTextBoxSubmissionAlreadyClosed());
      }

      if (newTextBox.newPart.newAssignment.newSubmission.tutorId !== tutorId) {
        return Result.fail(new SaveNewTextBoxWrongTutor());
      }

      if (newTextBox.newPart.newAssignment.newSubmission.tutorComment) {
        return Result.fail(new SaveNewTextBoxAlreadyReturned());
      }

      if (newTextBox.text.length === 0) {
        return Result.fail(new SaveNewTextBoxIncomplete());
      }

      if (mark !== null) {
        if (newTextBox.points === 0) {
          return Result.fail(new SaveNewTextBoxZeroPoints());
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

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: { mark, notes: notes?.length ? notes : null },
        where: { textBoxId: textBoxIdBin },
      });

      return Result.success({
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
        created: updatedTextBox.created,
        modified: updatedTextBox.modified,
      });

    } catch (err) {
      this.logger.error('error saving text box mark', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
