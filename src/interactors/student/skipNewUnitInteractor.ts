import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { NewUnitDTO } from '../../domain/student/newUnitDTO';
import { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SkipNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type SkipNewUnitResponseDTO = NewUnitDTO;

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
          assignments: { include: { parts: { include: { textBoxes: true, uploadSlots: true } } } },
        },
      });

      if (!unit) {
        return Result.fail(new SkipNewUnitNotFound());
      }

      if (!unit.enrollment.onHold) {
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
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        enrollmentId: updatedUnit.enrollmentId,
        tutorId: updatedUnit.tutorId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        description: updatedUnit.description,
        optional: updatedUnit.optional,
        complete: true,
        adminComment: unit.adminComment,
        submitted: updatedUnit.submitted,
        skipped: updatedUnit.skipped,
        transferred: updatedUnit.transferred,
        marked: updatedUnit.marked,
        created: updatedUnit.created,
      });

    } catch (err) {
      this.logger.error('error skipping new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
