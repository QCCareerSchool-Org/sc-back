import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewTextBoxDTO } from '../../domain/newTextBoxDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type SaveNewTextBoxTextRequestDTO = {
  studentId: number;
  courseId: number;
  /** uuid */
  unitId: string;
  /** uuid */
  assignmentId: string;
  /** uuid */
  partId: string;
  /** uuid */
  textBoxId: string;
  text: string;
};

export type SaveNewTextBoxTextResponseDTO = NewTextBoxDTO;

export class SaveNewTextBoxTextNotFound extends Error { }
export class SaveNewTextBoxTextUnitSubmitted extends Error { }
export class SaveNewTextBoxTextTooLong extends Error { }

export class SaveNewTextBoxTextInteractor implements IInteractor<SaveNewTextBoxTextRequestDTO, SaveNewTextBoxTextResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId, partId, textBoxId, text }: SaveNewTextBoxTextRequestDTO): Promise<ResultType<SaveNewTextBoxTextResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const textBoxIdBin = this.uuidService.uuidToBin(textBoxId);

      const newTextBox = await this.prisma.newTextBox.findFirst({
        where: { textBoxId: textBoxIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, enrollment: { studentId, courseId, course: { enabled: true } } } } } },
        include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
      });
      if (!newTextBox) {
        throw new SaveNewTextBoxTextNotFound();
      }

      if (newTextBox.newPart.newAssignment.newUnit.submitted) {
        throw new SaveNewTextBoxTextUnitSubmitted();
      }

      const maxLength = 65_535;
      const length = [ ...text ].length;
      if (length > maxLength) {
        throw new SaveNewTextBoxTextTooLong();
      }

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: { text },
        where: { textBoxId: textBoxIdBin },
        include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        points: updatedTextBox.points,
        mark: updatedTextBox.newPart.newAssignment.newUnit.closed ? updatedTextBox.mark : null, // hide mark unless the unit is marked
        notes: null, // students should never see the tutor's notes
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        text: updatedTextBox.text,
        complete: updatedTextBox.text.length > 0,
        created: updatedTextBox.created,
        modified: updatedTextBox.modified,
      });

    } catch (err) {
      this.logger.error('error saving text box text', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
