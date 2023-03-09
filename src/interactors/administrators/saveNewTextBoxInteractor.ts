import type { PrismaClient } from '@prisma/client';

import type { NewTextBoxDTO } from '../../domain/administrators/newTextBoxDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type SaveNewTextBoxRequestDTO = {
  /** uuid */
  textBoxId: string;
  markOverride: number | null;
};

export type SaveNewTextBoxResponseDTO = NewTextBoxDTO;

abstract class SaveNewTextBoxError extends Error { }
export class SaveNewTextBoxNotFound extends SaveNewTextBoxError { }
export class SaveNewTextBoxSubmissionNotSubmitted extends SaveNewTextBoxError { }
export class SaveNewTextBoxSubmissionNotClosed extends SaveNewTextBoxError { }
export class SaveNewTextBoxMarkOverrideOutOfRange extends SaveNewTextBoxError { }

export class SaveNewTextBoxInteractor implements IInteractor<SaveNewTextBoxRequestDTO, SaveNewTextBoxResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewTextBoxRequestDTO): Promise<ResultType<SaveNewTextBoxResponseDTO>> {
    try {
      const textBoxIdBin = this.uuidService.uuidToBin(request.textBoxId);

      const textBox = await this.prisma.newTextBox.findUnique({
        where: { textBoxId: textBoxIdBin },
        include: {
          newPart: { include: { newAssignment: { include: { newSubmission: true } } } },
        },
      });
      if (!textBox) {
        return Result.fail(new SaveNewTextBoxNotFound());
      }

      // submission must be submitted and can't be skipped
      if (!textBox.newPart.newAssignment.newSubmission.submitted || (textBox.newPart.newAssignment.newSubmission.submitted && textBox.newPart.newAssignment.newSubmission.skipped)) {
        return Result.fail(new SaveNewTextBoxSubmissionNotSubmitted());
      }

      // submission must be closed
      if (!textBox.newPart.newAssignment.newSubmission.closed) {
        return Result.fail(new SaveNewTextBoxSubmissionNotClosed());
      }

      // validate the data
      if (request.markOverride !== null) {
        if (request.markOverride < 0 || request.markOverride > textBox.points) {
          return Result.fail(new SaveNewTextBoxMarkOverrideOutOfRange());
        }
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: {
          markOverride: request.markOverride,
          modified: prismaNow,
        },
        where: { textBoxId: textBoxIdBin },
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        points: updatedTextBox.points,
        mark: updatedTextBox.mark,
        markOverride: updatedTextBox.markOverride,
        notes: updatedTextBox.notes,
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        text: updatedTextBox.text,
        complete: updatedTextBox.text.length > 0,
        created: this.dateService.fixPrismaReadDate(updatedTextBox.created),
        modified: this.dateService.fixPrismaReadDate(updatedTextBox.modified),
      });

    } catch (err) {
      this.logger.error('error updating text box', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
