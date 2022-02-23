import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SaveNewTextBoxTextRequestDTO = {
  studentId: number;
  /** hex string */
  unitId: string;
  /** hex string */
  assignmentId: string;
  /** hex string */
  partId: string;
  /** hex string */
  textBoxId: string;
  text: string;
};

export type SaveNewTextBoxTextResponseDTO = {
  /** hex string */
  textBoxId: string;
  /** hex string */
  partId: string;
  description: string | null;
  lines: number | null;
  optional: boolean;
  order: number;
  text: string;
  complete: boolean;
};

export class SaveNewTextBoxTextNotFound extends Error { }
export class SaveNewTextBoxTextEntityNotFound extends Error { }

/**
 * When saving text, we'll recheck the part, assignment, and unit to
 * see if they're complete and update them as well. We could avoid the extra
 * work here, and recalculate the `complete` status of units, and assignments
 * when needed, but then we'd have to check every text box and upload slot of
 * every part of every assignment each time we wanted to retrieve a unit.
 */
export class SaveNewTextBoxTextInteractor implements IInteractor<SaveNewTextBoxTextRequestDTO, SaveNewTextBoxTextResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId, assignmentId, partId, textBoxId, text }: SaveNewTextBoxTextRequestDTO): Promise<ResultType<SaveNewTextBoxTextResponseDTO>> {
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
                enrollment: { studentId },
              },
            },
          },
        },
      });

      if (!textBox) {
        return Result.fail(new SaveNewTextBoxTextNotFound());
      }

      // we can now trust all values for unitId, assignmentId, partId, and textBoxId

      const data = await this.prisma.$transaction(async transaction => {
        // update the text box
        const updatedTextBox = await transaction.newTextBox.update({
          data: { text, complete: text.length > 0 },
          where: { textBoxId: textBoxIdBin },
        });

        // retrieve the parent unit and all of its assignments, parts, text boxes, and upload slots
        const unit = await transaction.newUnit.findUnique({
          where: { unitId: unitIdBin },
          include: { assignments: { include: { parts: { include: { textBoxes: true, uploadSlots: true } } } } },
        });
        if (!unit) {
          throw new SaveNewTextBoxTextEntityNotFound();
        }

        const assignment = unit.assignments.find(a => Buffer.compare(a.assignmentId, assignmentIdBin) === 0);
        if (!assignment) {
          throw new SaveNewTextBoxTextEntityNotFound();
        }

        const part = assignment.parts.find(p => Buffer.compare(p.partId, partIdBin) === 0);
        if (!part) {
          throw new SaveNewTextBoxTextEntityNotFound();
        }

        const textBoxesComplete = part.textBoxes.filter(t => !t.optional).every(t => t.complete);
        const uploadSlotsComplete = part.uploadSlots.filter(u => !u.optional).every(u => u.complete);
        const partComplete = textBoxesComplete && uploadSlotsComplete;

        const otherPartsComplete = assignment.parts
          .filter(p => Buffer.compare(p.partId, partIdBin) !== 0)
          .filter(p => !p.optional)
          .every(p => p.complete);
        const assignmentComplete = (partComplete || part.optional) && otherPartsComplete;

        const otherAssignmentsComplete = unit.assignments
          .filter(a => Buffer.compare(a.assignmentId, assignmentIdBin) !== 0)
          .filter(a => !a.optional)
          .every(a => a.complete);
        const unitComplete = (assignmentComplete || assignment.optional) && otherAssignmentsComplete;

        await transaction.newUnit.update({
          where: { unitId: unitIdBin },
          data: {
            complete: unitComplete,
            assignments: {
              update: {
                where: { assignmentId: assignmentIdBin },
                data: {
                  complete: assignmentComplete,
                  parts: {
                    update: {
                      where: { partId: partIdBin },
                      data: { complete: partComplete },
                    },
                  },
                },
              },
            },
          },
        });

        // return the text box from the start of the transaction
        return updatedTextBox;
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(data.textBoxId),
        partId: this.uuidService.binToUUID(data.partId),
        description: data.description,
        lines: data.lines,
        optional: data.optional,
        order: data.order,
        text: data.text,
        complete: data.complete,
      });

    } catch (err) {
      this.logger.error('error saving text box text', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
