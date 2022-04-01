import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
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

export class ReturnNewUnitNotFound extends Error { }
export class ReturnNewUnitNotSubmitted extends Error { }
export class ReturnNewUnitAlreadyClosed extends Error { }
export class ReturnNewUnitWrongTutor extends Error { }
export class ReturnNewUnitAlreadyReturned extends Error { }
export class ReturnNewUnitCommentEmpty extends Error { }

export class ReturnNewUnitInteractor implements IInteractor<ReturnNewUnitRequestDTO, ReturnNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId, comment }: ReturnNewUnitRequestDTO): Promise<ResultType<ReturnNewUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const newUnit = await this.prisma.newUnit.findFirst({
        where: { unitId: unitIdBin, enrollment: { studentId } },
        include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
      });

      if (!newUnit) {
        return Result.fail(new ReturnNewUnitNotFound());
      }

      if (!newUnit.submitted) {
        return Result.fail(new ReturnNewUnitNotSubmitted());
      }

      if (newUnit.marked) {
        return Result.fail(new ReturnNewUnitAlreadyClosed());
      }

      if (newUnit.tutorId !== tutorId) {
        return Result.fail(new ReturnNewUnitWrongTutor());
      }

      if (newUnit.tutorComment) {
        return Result.fail(new ReturnNewUnitAlreadyReturned());
      }

      if (comment.length === 0) {
        return Result.fail(new ReturnNewUnitCommentEmpty());
      }

      const updatedUnit = await this.prisma.newUnit.update({
        data: { tutorComment: comment },
        where: { unitId: unitIdBin },
        include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
      });

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
        skipped: updatedUnit.skipped,
        transferred: updatedUnit.transferred,
        marked: updatedUnit.marked,
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
