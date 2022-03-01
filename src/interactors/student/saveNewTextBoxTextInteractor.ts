import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { NewTextBoxDTO } from '../../domain/student/newTextBoxDTO';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

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
export class SaveNewTextBoxTextUnitSkipped extends Error { }

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

      const textBox = await this.prisma.newTextBox.findFirst({
        where: {
          textBoxId: textBoxIdBin,
          part: {
            partId: partIdBin,
            assignment: {
              assignmentId: assignmentIdBin,
              unit: {
                unitId: unitIdBin,
                enrollment: { studentId, courseId, course: { enabled: true } },
              },
            },
          },
        },
        include: { part: { include: { assignment: { include: { unit: true } } } } },
      });

      if (!textBox) {
        return Result.fail(new SaveNewTextBoxTextNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      if (textBox.part.assignment.unit.submitted) {
        return Result.fail(new SaveNewTextBoxTextUnitSubmitted());
      }

      if (textBox.part.assignment.unit.skipped) {
        return Result.fail(new SaveNewTextBoxTextUnitSkipped());
      }

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: { text },
        where: { textBoxId: textBoxIdBin },
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        text: updatedTextBox.text,
        complete: updatedTextBox.text.length > 0,
      });

    } catch (err) {
      this.logger.error('error saving text box text', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
