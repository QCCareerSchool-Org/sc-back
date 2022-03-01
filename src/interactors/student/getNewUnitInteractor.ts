import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewUnitRequestDTO = {
  studentId: number;
  unitId: string;
};

export type GetNewUnitResponseDTO = {
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
    parts: Array<{
      /** uuid */
      partId: string;
      textBoxes: Array<{
        /** uuid */
        textBoxId: string;
      }>;
      uploadSlots: Array<{
        /** uuid */
        uploadSlotId: string;
      }>;
    }>;
  }>;
};

export class GetNewUnitNotFound extends Error { }

export class GetNewUnitInteractor implements IInteractor<GetNewUnitRequestDTO, GetNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId }: GetNewUnitRequestDTO): Promise<ResultType<GetNewUnitResponseDTO>> {
    try {
      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollment: { studentId },
          unitId: this.uuidService.uuidToBin(unitId),
        },
        include: {
          enrollment: true,
          // assignments: true,
          assignments: { include: { parts: { include: { textBoxes: true, uploadSlots: true } } } },
        },
      });

      if (!unit) {
        return Result.fail(new GetNewUnitNotFound());
      }

      let unitComplete = true;

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        enrollmentId: unit.enrollmentId,
        tutorId: unit.tutorId,
        unitLetter: unit.unitLetter,
        title: unit.title,
        description: unit.description,
        optional: unit.optional,
        adminComment: unit.adminComment,
        submitted: unit.submitted,
        skipped: unit.skipped,
        transferred: unit.transferred,
        marked: unit.marked,
        created: unit.created,
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
        assignments: unit.assignments.map(a => {
          let assignmentComplete = true;
          const assignment = {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            unitId: this.uuidService.binToUUID(a.unitId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            optional: a.optional,
            parts: a.parts.map(p => {
              let partComplete = true;
              const part = {
                partId: this.uuidService.binToUUID(p.partId),
                textBoxes: p.textBoxes.map(t => {
                  const textBoxComplete = t.text.length > 0;
                  if (!t.optional && !textBoxComplete) {
                    partComplete = false;
                  }
                  return {
                    textBoxId: this.uuidService.binToUUID(t.textBoxId),
                    complete: textBoxComplete,
                  };
                }),
                uploadSlots: p.uploadSlots.map(u => {
                  const uploadSlotComplete = u.filename !== null;
                  if (!u.optional && !uploadSlotComplete) {
                    partComplete = false;
                  }
                  return {
                    uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                    complete: uploadSlotComplete,
                  };
                }),
                complete: partComplete,
              };
              if (!p.optional && !partComplete) {
                assignmentComplete = false;
              }
              return part;
            }),
            complete: assignmentComplete,
          };
          if (!a.optional && !assignmentComplete) {
            unitComplete = false;
          }
          return assignment;
        }),
        complete: unitComplete,
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
