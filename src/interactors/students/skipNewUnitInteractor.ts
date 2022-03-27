import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type SkipNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type SkipNewUnitResponseDTO = Omit<NewUnitDTO, 'complete' | 'points' | 'mark'>;

export class SkipNewUnitNotFound extends Error { }
export class SkipNewUnitEnrollmentOnHold extends Error { }
export class SkipNewUnitAlreadySubmitted extends Error { }
export class SkipNewUnitAlreadySkipped extends Error { }

export class SkipNewUnitInteractor implements IInteractor<SkipNewUnitRequestDTO, SkipNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId }: SkipNewUnitRequestDTO): Promise<ResultType<SkipNewUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollment: { studentId, courseId, course: { enabled: true } },
          unitId: unitIdBin,
        },
        include: {
          enrollment: true,
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
        },
      });

      if (!unit) {
        return Result.fail(new SkipNewUnitNotFound());
      }

      if (unit.enrollment.onHold) {
        return Result.fail(new SkipNewUnitEnrollmentOnHold());
      }

      if (unit.submitted) {
        return Result.fail(new SkipNewUnitAlreadySubmitted());
      }

      if (unit.skipped) {
        return Result.fail(new SkipNewUnitAlreadySkipped());
      }

      const updatedUnit = await this.prisma.newUnit.update({
        data: {
          skipped: this.dateService.getDate(),
          tutorId: unit.enrollment.tutorId,
        },
        where: { unitId: unitIdBin },
        include: { enrollment: { include: { course: true } } },
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        enrollmentId: updatedUnit.enrollmentId,
        tutorId: updatedUnit.tutorId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        description: updatedUnit.description,
        optional: updatedUnit.optional,
        order: updatedUnit.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: unit.adminComment,
        submitted: updatedUnit.submitted,
        skipped: updatedUnit.skipped,
        transferred: updatedUnit.transferred,
        marked: updatedUnit.marked,
        responseFilename: updatedUnit.responseFilename === null ? null : `${updatedUnit.enrollment.course.code}${updatedUnit.enrollment.enrollmentId} Unit ${updatedUnit.unitLetter}.mp3`,
        responseFilesize: updatedUnit.responseFilesize,
        responseMimeTypeId: updatedUnit.responseMimeTypeId,
        created: updatedUnit.created,
        modified: updatedUnit.modified,
      });

    } catch (err) {
      this.logger.error('error skipping new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
