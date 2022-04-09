import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type EraseNewUnitFeedbackRequestDTO = {
  tutorId: number;
  studentId: number;
  unitId: string;
};

export type EraseNewUnitFeedbackResponseDTO = NewUnitDTO;

export class EraseNewUnitFeedbackNotFound extends Error { }
export class EraseNewUnitFeedbackUnitNotSubmitted extends Error { }
export class EraseNewUnitFeedbackUnitSkipped extends Error { }
export class EraseNewUnitFeedbackUnitAlreadyClosed extends Error { }
export class EraseNewUnitFeedbackWrongTutor extends Error { }
export class EraseNewUnitFeedbackFileUnlinkError extends Error { }

export class EraseNewUnitFeedbackInteractor implements IInteractor<EraseNewUnitFeedbackRequestDTO, EraseNewUnitFeedbackResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId }: EraseNewUnitFeedbackRequestDTO): Promise<ResultType<EraseNewUnitFeedbackResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const newUnit = await this.prisma.newUnit.findFirst({
        where: {
          unitId: unitIdBin,
          enrollment: { studentId },
        },
      });

      if (!newUnit) {
        return Result.fail(new EraseNewUnitFeedbackNotFound());
      }

      if (!newUnit.submitted) {
        return Result.fail(new EraseNewUnitFeedbackUnitNotSubmitted());
      }

      if (newUnit.skipped) {
        return Result.fail(new EraseNewUnitFeedbackUnitSkipped());
      }

      if (newUnit.closed) {
        return Result.fail(new EraseNewUnitFeedbackUnitAlreadyClosed());
      }

      if (newUnit.tutorId !== tutorId) {
        return Result.fail(new EraseNewUnitFeedbackWrongTutor());
      }

      const updatedUnit = await this.prisma.$transaction(async transaction => {
        const updated = await transaction.newUnit.update({
          data: {
            responseFilename: null,
            responseFilesize: null,
            responseMimeTypeId: null,
          },
          where: { unitId: unitIdBin },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });

        const paddedStudentId = studentId.toString().padStart(8, '0');

        // delete the file
        const filePath = `${this.configService.config.paths.unitFeedbackPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${unitId}`;
        try {
          await this.fileService.unlink(filePath);
        } catch (err) {
          this.logger.error(`Could not unlink feedback ${filePath}`, err);
          throw new EraseNewUnitFeedbackFileUnlinkError();
        }

        return updated;
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
      this.logger.error('error deleting new unit feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
