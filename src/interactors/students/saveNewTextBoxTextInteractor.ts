import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import { attemptOCCTransaction } from '../../attemptOCCTransaction';
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

      const updatedTextBox = await attemptOCCTransaction(async () => {
        const newUnit = await this.prisma.newUnit.findFirst({
          where: { unitId: unitIdBin, enrollment: { studentId, courseId, course: { enabled: true } } },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });
        if (!newUnit) {
          throw new SaveNewTextBoxTextNotFound();
        }

        if (newUnit.submitted) {
          throw new SaveNewTextBoxTextUnitSubmitted();
        }

        if (newUnit.skipped) {
          throw new SaveNewTextBoxTextUnitSkipped();
        }

        const newAssignment = newUnit.newAssignments.find(a => a.assignmentId.compare(assignmentIdBin) === 0);
        if (!newAssignment) {
          throw new SaveNewTextBoxTextNotFound();
        }

        const newPart = newAssignment.newParts.find(p => p.partId.compare(partIdBin) === 0);
        if (!newPart) {
          throw new SaveNewTextBoxTextNotFound();
        }

        const newTextBox = newPart.newTextBoxes.find(t => t.textBoxId.compare(textBoxIdBin) === 0);
        if (!newTextBox) {
          throw new SaveNewTextBoxTextNotFound();
        }

        let unitComplete = true;
        let unitMarked = true;
        let unitPoints = 0;
        let unitMark = 0;
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        let partComplete = true;
        let partMarked = true;
        let partPoints = 0;
        let partMark = 0;
        let textBoxComplete = true;

        for (const a of newUnit.newAssignments) {
          if (a.assignmentId.compare(assignmentIdBin) === 0) {
            for (const p of a.newParts) {
              if (p.partId.compare(partIdBin) === 0) {
                for (const t of p.newTextBoxes) {
                  if (t.textBoxId.compare(textBoxIdBin) === 0) {
                    textBoxComplete = text.length > 0;
                    if (!textBoxComplete && !t.optional) {
                      partComplete = false;
                    }
                    if (textBoxComplete || !t.optional) {
                      if (t.mark === null) {
                        partMarked = false;
                      }
                      partPoints += t.points;
                      partMark += t.mark ?? 0;
                    }
                  } else {
                    if (!t.complete && !t.optional) {
                      partComplete = false;
                    }
                    if (t.complete || !t.optional) {
                      if (t.mark === null) {
                        partMarked = false;
                      }
                      partPoints += t.points;
                      partMark += t.mark ?? 0;
                    }
                  }
                }
                for (const u of p.newUploadSlots) {
                  if (!u.complete && !u.optional) {
                    partComplete = false;
                  }
                  if (u.complete || !u.optional) {
                    if (u.mark === null) {
                      partMarked = false;
                    }
                    partPoints += u.points;
                    partMark += u.mark ?? 0;
                  }
                }
                if (!partComplete) {
                  assignmentComplete = false;
                }
                if (!partMarked) {
                  assignmentMarked = false;
                }
                assignmentPoints += partPoints;
                assignmentMark += partMark;
              } else {
                if (!p.complete) {
                  assignmentComplete = false;
                }
                if (p.mark === null) {
                  assignmentMarked = false;
                }
                assignmentPoints += p.points;
                assignmentMark += p.mark ?? 0;
              }
            }
            if (!assignmentComplete && !newAssignment.optional) {
              unitComplete = false;
            }
            if (assignmentComplete || !newAssignment.optional) {
              if (!assignmentMarked) {
                unitMarked = false;
              }
              unitPoints += assignmentPoints;
              unitMark += assignmentMark;
            }
          } else {
            if (!a.complete && !a.optional) {
              unitComplete = false;
            }
            if (a.complete || !a.optional) {
              if (!assignmentMarked) {
                unitMarked = false;
              }
              unitPoints += a.points;
              unitMark += a.mark ?? 0;
            }
          }
        }

        console.log('textBoxComplete', textBoxComplete, 'partComplete', partComplete, 'entityVersion', newUnit.entityVersion);

        await this.prisma.$executeRaw`SET TRANSACTION ISOLATION LEVEL READ COMMITTED`;

        const [ updated, , , batchPayload ] = await this.prisma.$transaction([
          this.prisma.newTextBox.update({
            data: {
              text,
              complete: textBoxComplete,
            },
            where: { textBoxId: textBoxIdBin },
            include: { newPart: { include: { newAssignment: { include: { newUnit: true } } } } },
          }),
          this.prisma.newPart.update({
            data: {
              complete: partComplete,
              points: partPoints,
              mark: partMarked ? partMark : null,
            },
            where: { partId: partIdBin },
          }),
          this.prisma.newAssignment.update({
            data: {
              complete: assignmentComplete,
              points: assignmentPoints,
              mark: assignmentMarked ? assignmentMark : null,
            },
            where: { assignmentId: assignmentIdBin },
          }),
          this.prisma.newUnit.updateMany({
            data: {
              complete: unitComplete,
              points: unitPoints,
              mark: unitMarked ? unitMark : null,
              entityVersion: { increment: 1 },
            },
            where: { unitId: unitIdBin, entityVersion: newUnit.entityVersion },
          }),
        ]);

        if (batchPayload.count === 0) {
          console.log('didn\'t update');
          return false;
        }

        return updated;
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        text: updatedTextBox.text,
        complete: updatedTextBox.complete,
        points: updatedTextBox.points,
        mark: updatedTextBox.newPart.newAssignment.newUnit.marked ? updatedTextBox.mark : null, // hide mark unless the unit is marked
        created: updatedTextBox.created,
        modified: updatedTextBox.modified,
      });

    } catch (err) {
      this.logger.error('error saving text box text', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
