import type { NewAssignment, NewPart, NewTextBox, NewUnit, NewUploadSlot, PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type ReturnNewUnitRequestDTO = {
  tutorId: number;
  studentId: number;
  unitId: string;
  comment: string;
};

export type ReturnNewUnitResponseDTO = NewUnitDTO;

abstract class ReturnNewUnitError extends Error { }
export class ReturnNewUnitNotFound extends ReturnNewUnitError { }
export class ReturnNewUnitNotSubmitted extends ReturnNewUnitError { }
export class ReturnNewUnitSkipped extends ReturnNewUnitError { }
export class ReturnNewUnitAlreadyClosed extends ReturnNewUnitError { }
export class ReturnNewUnitWrongTutor extends ReturnNewUnitError { }
export class ReturnNewUnitAlreadyReturned extends ReturnNewUnitError { }
export class ReturnNewUnitCommentEmpty extends ReturnNewUnitError { }

export class ReturnNewUnitInteractor implements IInteractor<ReturnNewUnitRequestDTO, ReturnNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId, comment }: ReturnNewUnitRequestDTO): Promise<ResultType<ReturnNewUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      let updatedUnit: NewUnit & {
        newAssignments: (NewAssignment & {
          newParts: (NewPart & {
            newTextBoxes: NewTextBox[];
            newUploadSlots: NewUploadSlot[];
          })[];
        })[];
      };

      try {
        updatedUnit = await this.prisma.$transaction(async transaction => {
          const newUnit = await transaction.newUnit.findFirst({
            where: { unitId: unitIdBin, enrollment: { studentId } },
            include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
          });

          if (!newUnit) {
            throw new ReturnNewUnitNotFound();
          }

          if (!newUnit.submitted) {
            throw new ReturnNewUnitNotSubmitted();
          }

          if (newUnit.skipped) {
            throw new ReturnNewUnitSkipped();
          }

          if (newUnit.closed) {
            throw new ReturnNewUnitAlreadyClosed();
          }

          if (newUnit.tutorId !== tutorId) {
            throw new ReturnNewUnitWrongTutor();
          }

          if (newUnit.tutorComment) {
            throw new ReturnNewUnitAlreadyReturned();
          }

          if (comment.length === 0) {
            throw new ReturnNewUnitCommentEmpty();
          }

          return transaction.newUnit.update({
            data: {
              tutorComment: comment,
              returns: {
                create: {
                  unitReturnId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                },
              },
            },
            where: { unitId: unitIdBin },
            include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
          });
        });
      } catch (err) {
        if (err instanceof ReturnNewUnitError) {
          return Result.fail(err);
        }
        throw err;
      }

      let unitComplete = true;
      let unitMarked = true;
      let unitPoints = 0;
      let unitMark = 0;

      for (const a of updatedUnit.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        for (const p of a.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          for (const t of p.newTextBoxes) {
            const textBoxComplete = t.text.length > 0;
            if (!textBoxComplete && !t.optional) {
              partComplete = false;
            }
            if (textBoxComplete && t.mark === null && t.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (textBoxComplete || !t.optional) {
              partPoints += t.points;
              partMark += t.mark ?? 0;
            }
          }
          for (const u of p.newUploadSlots) {
            const uploadSlotComplete = u.filename !== null;
            if (!uploadSlotComplete && !u.optional) {
              partComplete = false;
            }
            if (uploadSlotComplete && u.mark === null && u.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (uploadSlotComplete || !u.optional) {
              partPoints += u.points;
              partMark += u.mark ?? 0;
            }
          }
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
        }
        if (!assignmentComplete && !a.optional) {
          unitComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          unitMarked = false;
        }
        // ignore incomplete, optional assignments
        if (assignmentComplete || !a.optional) {
          unitPoints += assignmentPoints;
          unitMark += assignmentMark;
        }
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        enrollmentId: updatedUnit.enrollmentId,
        tutorId: updatedUnit.tutorId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        description: updatedUnit.description,
        markingCriteria: updatedUnit.markingCriteria,
        optional: updatedUnit.optional,
        order: updatedUnit.order,
        tutorComment: updatedUnit.tutorComment,
        adminComment: updatedUnit.adminComment,
        submitted: updatedUnit.submitted,
        transferred: updatedUnit.transferred,
        closed: updatedUnit.closed,
        skipped: updatedUnit.skipped,
        responseFilename: updatedUnit.responseFilename,
        responseFilesize: updatedUnit.responseFilesize,
        responseMimeTypeId: updatedUnit.responseMimeTypeId,
        created: updatedUnit.created,
        modified: updatedUnit.modified,
        complete: unitComplete,
        points: unitPoints,
        mark: unitMarked ? unitMark : null,
      });

    } catch (err) {
      this.logger.error('error returning new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
