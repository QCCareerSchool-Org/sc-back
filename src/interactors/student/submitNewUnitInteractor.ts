import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SubmitNewUnitRequestDTO = {
  studentId: number;
  unitId: string;
};

export type SubmitNewUnitResponseDTO = {
  /** uuid */
  unitId: string;
  enrollmentId: number;
  tutorId: number | null;
  unitLetter: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
  // students should never see `tutorComment`
  adminComment: string | null;
  submitted: Date | null;
  skipped: Date | null;
  transferred: Date | null;
  marked: Date | null;
  created: Date;
  enrollment: {
    enrollmentId: number;
    courseId: number;
    studentNumber: number;
    tutorId: number | null;
    maxAssignments: number | null;
    graduated: boolean;
    assignmentsDisabled: boolean;
    quizzesDisabled: boolean;
    onHold: boolean;
    holdReason: string | null;
    currencyCode: string;
    courseCost: number;
    amountPaid: number;
    monthlyInstallment: number | null;
    enrollmentDate: Date | null;
    fastTrack: boolean;
    paymentsDisabled: boolean;
  };
  assignments: Array<{
    /** uuid */
    assignmentId: string;
    /** uuid */
    unitId: string;
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
    complete: boolean;
  }>;
};

export class SubmitNewUnitNotFound extends Error { }
export class SubmitNewUnitEnrollmentOnHold extends Error { }
export class SubmitNewUnitIncomplete extends Error { }
export class SubmitNewUnitAlreadySubmitted extends Error { }
export class SubmitNewUnitAlreadySkipped extends Error { }
export class SubmitNewUnitAwaitingAdminComment extends Error { }
export class SubmitNewUnitTutorNotAssigned extends Error { }

export class SubmitNewUnitInteractor implements IInteractor<SubmitNewUnitRequestDTO, SubmitNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId }: SubmitNewUnitRequestDTO): Promise<ResultType<SubmitNewUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollment: { studentId },
          unitId: unitIdBin,
        },
        include: { enrollment: true, assignments: true },
      });

      if (!unit) {
        return Result.fail(new SubmitNewUnitNotFound());
      }

      if (!unit.enrollment.onHold) {
        return Result.fail(new SubmitNewUnitEnrollmentOnHold());
      }

      if (!unit.complete) {
        return Result.fail(new SubmitNewUnitIncomplete());
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
        complete: updatedUnit.complete,
        adminComment: unit.adminComment,
        submitted: updatedUnit.submitted,
        skipped: updatedUnit.skipped,
        transferred: updatedUnit.transferred,
        marked: updatedUnit.marked,
        created: updatedUnit.created,
        enrollment: {
          enrollmentId: unit.enrollment.enrollmentId,
          courseId: unit.enrollment.courseId,
          studentNumber: unit.enrollment.studentNumber,
          tutorId: unit.enrollment.tutorId,
          maxAssignments: unit.enrollment.maxAssignments,
          graduated: unit.enrollment.graduated,
          assignmentsDisabled: unit.enrollment.assignmentsDisabled,
          quizzesDisabled: unit.enrollment.quizzesDisabled,
          onHold: unit.enrollment.onHold,
          holdReason: unit.enrollment.holdReason,
          currencyCode: unit.enrollment.currencyCode,
          courseCost: unit.enrollment.courseCost.toNumber(),
          amountPaid: unit.enrollment.amountPaid.toNumber(),
          monthlyInstallment: unit.enrollment.monthlyInstallment === null ? null : unit.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: unit.enrollment.enrollmentDate,
          fastTrack: unit.enrollment.fastTrack,
          paymentsDisabled: unit.enrollment.paymentsDisabled,
        },
        assignments: unit.assignments.map(a => ({
          assignmentId: this.uuidService.binToUUID(a.assignmentId),
          unitId: this.uuidService.binToUUID(a.unitId),
          assignmentNumber: a.assignmentNumber,
          title: a.title,
          description: a.description,
          optional: a.optional,
          complete: a.complete,
        })),
      });

    } catch (err) {
      this.logger.error('error submitting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
