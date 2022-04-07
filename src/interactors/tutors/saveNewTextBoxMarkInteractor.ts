import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewTextBoxDTO } from '../../domain/newTextBoxDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type SaveNewTextBoxMarkRequestDTO = {
  tutorId: number;
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
  mark: number | null;
};

export type SaveNewTextBoxMarkResponseDTO = NewTextBoxDTO;

export class SaveNewTextBoxMarkNotFound extends Error { }
export class SaveNewTextBoxMarkUnitAlreadySubmitted extends Error { }
export class SaveNewTextBoxMarkUnitAlreadyClosed extends Error { }
export class SaveNewTextBoxMarkWrongTutor extends Error { }
export class SaveNewTextBoxMarkAlreadyReturned extends Error { }
export class SaveNewTextBoxMarkIncomplete extends Error { }
export class SaveNewTextBoxMarkZeroPoints extends Error { }
export class SaveNewTextBoxMarkLessThanZero extends Error { }
export class SaveNewTextBoxMarkTooHigh extends Error { }

export class SaveNewTextBoxMarkInteractor implements IInteractor<SaveNewTextBoxMarkRequestDTO, SaveNewTextBoxMarkResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewTextBoxMarkRequestDTO): Promise<ResultType<SaveNewTextBoxMarkResponseDTO>> {
    try {
      const { tutorId, studentId, courseId, mark } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const textBoxIdBin = this.uuidService.uuidToBin(request.textBoxId);

      const newTextBox = await this.prisma.newTextBox.findFirst({
        where: { textBoxId: textBoxIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, enrollment: { studentId, courseId, course: { enabled: true } } } } } },
        include: { newPart: { include: { newAssignment: { include: { newUnit: { include: { tutor: true } } } } } } },
      });
      if (!newTextBox) {
        throw new SaveNewTextBoxMarkNotFound();
      }

      if (!newTextBox.newPart.newAssignment.newUnit.submitted) {
        throw new SaveNewTextBoxMarkUnitAlreadySubmitted();
      }

      if (newTextBox.newPart.newAssignment.newUnit.marked) {
        return Result.fail(new SaveNewTextBoxMarkUnitAlreadyClosed());
      }

      if (newTextBox.newPart.newAssignment.newUnit.tutorId !== tutorId) {
        return Result.fail(new SaveNewTextBoxMarkWrongTutor());
      }

      if (newTextBox.newPart.newAssignment.newUnit.tutorComment) {
        return Result.fail(new SaveNewTextBoxMarkAlreadyReturned());
      }

      if (newTextBox.text.length === 0) {
        return Result.fail(new SaveNewTextBoxMarkIncomplete());
      }

      if (newTextBox.points === 0) {
        return Result.fail(new SaveNewTextBoxMarkZeroPoints());
      }

      if (mark !== null) {
        if (mark < 0) {
          throw new SaveNewTextBoxMarkLessThanZero();
        }
        if (mark > newTextBox.points) {
          throw new SaveNewTextBoxMarkTooHigh();
        }
      }

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: { mark },
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
        points: updatedTextBox.points,
        mark: updatedTextBox.mark,
        created: updatedTextBox.created,
        modified: updatedTextBox.modified,
      });

    } catch (err) {
      this.logger.error('error saving text box mark', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
