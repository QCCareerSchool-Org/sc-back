import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';
import { unitIsComplete } from './unitIsComplete';

export type SubmitNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type SubmitNewUnitResponseDTO = NewUnitDTO;

export class SubmitNewUnitNotFound extends Error { }
export class SubmitNewUnitEnrollmentOnHold extends Error { }
export class SubmitNewUnitAlreadySubmitted extends Error { }
export class SubmitNewUnitAlreadySkipped extends Error { }
export class SubmitNewUnitAwaitingAdminComment extends Error { }
export class SubmitNewUnitIncomplete extends Error { }
export class SubmitNewUnitTutorNotAssigned extends Error { }

export class SubmitNewUnitInteractor implements IInteractor<SubmitNewUnitRequestDTO, SubmitNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId }: SubmitNewUnitRequestDTO): Promise<ResultType<SubmitNewUnitResponseDTO>> {
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
        return Result.fail(new SubmitNewUnitNotFound());
      }

      if (unit.enrollment.onHold) {
        return Result.fail(new SubmitNewUnitEnrollmentOnHold());
      }

      if (unit.submitted) {
        return Result.fail(new SubmitNewUnitAlreadySubmitted());
      }

      if (unit.skipped) {
        return Result.fail(new SubmitNewUnitAlreadySkipped());
      }

      // see if the tutor has sent this back to the student, but an administrator hasn't reviewed it yet
      if (unit.tutorComment !== null && unit.adminComment === null) {
        return Result.fail(new SubmitNewUnitAwaitingAdminComment());
      }

      if (!unitIsComplete(unit)) {
        return Result.fail(new SubmitNewUnitIncomplete());
      }

      if (unit.enrollment.tutorId === null) {
        return Result.fail(new SubmitNewUnitTutorNotAssigned());
      }

      const updatedUnit = await this.prisma.newUnit.update({
        data: {
          submitted: this.dateService.getDate(),
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
        order: updatedUnit.order,
        complete: true,
        tutorComment: null, // students should never see the tutor comment
        adminComment: unit.adminComment,
        submitted: updatedUnit.submitted,
        skipped: updatedUnit.skipped,
        transferred: updatedUnit.transferred,
        marked: updatedUnit.marked,
        points: 0, // we're not going to calculate this
        mark: null, // we're not going to calculate this
        created: updatedUnit.created,
        modified: updatedUnit.modified,
      });

    } catch (err) {
      this.logger.error('error submitting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
