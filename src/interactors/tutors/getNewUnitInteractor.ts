import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO';
import type { NewAssignmentDTO } from '../../domain/newAssignmentDTO';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { StudentDTO } from '../../domain/tutors/studentDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type GetNewUnitRequestDTO = {
  tutorId: number;
  studentId: number;
  unitId: string;
};

export type GetNewUnitResponseDTO = NewUnitDTO & {
  enrollment: EnrollmentDTO & {
    course: CourseDTO;
    student: StudentDTO;
  };
  newAssignments: NewAssignmentDTO[];
};

export class GetNewUnitNotFound extends Error { }
export class GetNewUnitWrongTutor extends Error { }

export class GetNewUnitInteractor implements IInteractor<GetNewUnitRequestDTO, GetNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId }: GetNewUnitRequestDTO): Promise<ResultType<GetNewUnitResponseDTO>> {
    try {
      const unit = await this.prisma.newUnit.findFirst({
        where: {
          unitId: this.uuidService.uuidToBin(unitId),
          enrollment: { studentId },
        },
        include: {
          enrollment: { include: { course: true, student: true } },
          newAssignments: {
            include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } },
            orderBy: { assignmentNumber: 'asc' },
          },
        },
      });

      if (!unit) {
        return Result.fail(new GetNewUnitNotFound());
      }

      if (unit.tutorId !== tutorId && unit.enrollment.tutorId !== tutorId) {
        return Result.fail(new GetNewUnitWrongTutor());
      }

      // let unitComplete = true;
      // let unitPoints = 0;
      // let unitMark = 0;

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        enrollmentId: unit.enrollmentId,
        tutorId: unit.tutorId,
        unitLetter: unit.unitLetter,
        title: unit.title,
        description: unit.description,
        optional: unit.optional,
        order: unit.order,
        tutorComment: unit.tutorComment,
        adminComment: unit.adminComment,
        submitted: unit.submitted,
        skipped: unit.skipped,
        transferred: unit.transferred,
        marked: unit.marked,
        complete: unit.complete,
        points: unit.points,
        mark: unit.mark,
        created: unit.created,
        modified: unit.modified,
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
          course: {
            courseId: unit.enrollment.course.courseId,
            schoolId: unit.enrollment.course.schoolId,
            code: unit.enrollment.course.code,
            version: unit.enrollment.course.version,
            studentTypeId: unit.enrollment.course.studentTypeId,
            name: unit.enrollment.course.name,
            courseGuide: unit.enrollment.course.courseGuide,
            quizzesEnabled: unit.enrollment.course.quizzesEnabled,
            noTutor: unit.enrollment.course.noTutor,
            unitType: unit.enrollment.course.unitType,
            enabled: unit.enrollment.course.enabled,
            order: unit.enrollment.course.order,
            newUnitsEnabled: unit.enrollment.course.newUnitsEnabled,
            entityVersion: unit.enrollment.course.entityVersion,
          },
          student: {
            studentId: unit.enrollment.student.studentId,
            countryId: unit.enrollment.student.countryId,
            provinceId: unit.enrollment.student.provinceId,
            studentTypeId: unit.enrollment.student.studentTypeId,
            sex: unit.enrollment.student.sex,
            firstName: unit.enrollment.student.firstName,
            lastName: unit.enrollment.student.lastName,
            entityVersion: unit.enrollment.student.entityVersion,
            timestamp: unit.enrollment.student.timestamp,
          },
        },
        newAssignments: unit.newAssignments.map(a => {
          // let assignmentComplete = true;
          // let assignmentMarked = true;
          // let assignmentPoints = 0;
          // let assignmentMark = 0;
          // for (const p of a.newParts) {
          //   let partComplete = true;
          //   let partMarked = true;
          //   let partPoints = 0;
          //   let partMark = 0;
          //   for (const t of p.newTextBoxes) {
          //     const textBoxComplete = t.text.length > 0;
          //     if (!textBoxComplete && !t.optional) {
          //       partComplete = false;
          //     }
          //     if (textBoxComplete && t.mark === null) {
          //       partMarked = false;
          //     }
          //     // ignore incomplete, optional inputs
          //     if (textBoxComplete || !t.optional) {
          //       partPoints += t.points;
          //       partMark += t.mark ?? 0;
          //     }
          //   }
          //   for (const u of p.newUploadSlots) {
          //     const uploadSlotComplete = u.filename !== null;
          //     if (!uploadSlotComplete && !u.optional) {
          //       partComplete = false;
          //     }
          //     if (uploadSlotComplete && u.mark === null) {
          //       partMarked = false;
          //     }
          //     // ignore incomplete, optional inputs
          //     if (uploadSlotComplete || !u.optional) {
          //       partPoints += u.points;
          //       partMark += u.mark ?? 0;
          //     }
          //   }
          //   if (!partComplete) {
          //     assignmentComplete = false;
          //   }
          //   if (!partMarked) {
          //     assignmentMarked = false;
          //   }
          //   // parts can't be optional, so we always add these
          //   assignmentPoints += partPoints;
          //   assignmentMark += partMark;
          // }
          // if (!a.optional && !assignmentComplete) {
          //   unitComplete = false;
          // }
          // // ignore incomplete, optional assignments
          // if (assignmentComplete || !a.optional) {
          //   unitPoints += assignmentPoints;
          //   unitMark += assignmentMark;
          // }
          return {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            unitId: this.uuidService.binToUUID(a.unitId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            optional: a.optional,
            complete: a.complete,
            points: a.points,
            mark: a.mark,
            created: a.created,
            modified: a.modified,
          };
        }),
        // complete: unitComplete,
        // points: unitPoints,
        // mark: unit.marked ? unitMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
