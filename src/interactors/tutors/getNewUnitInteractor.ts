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
      const newUnit = await this.prisma.newUnit.findFirst({
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

      if (!newUnit) {
        return Result.fail(new GetNewUnitNotFound());
      }

      if (newUnit.tutorId !== tutorId && newUnit.enrollment.tutorId !== tutorId) {
        return Result.fail(new GetNewUnitWrongTutor());
      }

      let unitComplete = true;
      let unitMarked = true;
      let unitPoints = 0;
      let unitMark = 0;

      return Result.success({
        unitId: this.uuidService.binToUUID(newUnit.unitId),
        enrollmentId: newUnit.enrollmentId,
        tutorId: newUnit.tutorId,
        unitLetter: newUnit.unitLetter,
        title: newUnit.title,
        description: newUnit.description,
        optional: newUnit.optional,
        order: newUnit.order,
        tutorComment: newUnit.tutorComment,
        adminComment: newUnit.adminComment,
        submitted: newUnit.submitted,
        skipped: newUnit.skipped,
        transferred: newUnit.transferred,
        marked: newUnit.marked,
        responseFilename: newUnit.responseFilename,
        responseFilesize: newUnit.responseFilesize,
        // complete: newUnit.complete,
        // points: newUnit.points,
        // mark: newUnit.mark,
        created: newUnit.created,
        modified: newUnit.modified,
        enrollment: {
          enrollmentId: newUnit.enrollment.enrollmentId,
          courseId: newUnit.enrollment.courseId,
          studentNumber: newUnit.enrollment.studentNumber,
          tutorId: newUnit.enrollment.tutorId,
          maxAssignments: newUnit.enrollment.maxAssignments,
          graduated: newUnit.enrollment.graduated,
          assignmentsDisabled: newUnit.enrollment.assignmentsDisabled,
          quizzesDisabled: newUnit.enrollment.quizzesDisabled,
          onHold: newUnit.enrollment.onHold,
          holdReason: newUnit.enrollment.holdReason,
          currencyCode: newUnit.enrollment.currencyCode,
          courseCost: newUnit.enrollment.courseCost.toNumber(),
          amountPaid: newUnit.enrollment.amountPaid.toNumber(),
          monthlyInstallment: newUnit.enrollment.monthlyInstallment === null ? null : newUnit.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: newUnit.enrollment.enrollmentDate,
          fastTrack: newUnit.enrollment.fastTrack,
          paymentsDisabled: newUnit.enrollment.paymentsDisabled,
          course: {
            courseId: newUnit.enrollment.course.courseId,
            schoolId: newUnit.enrollment.course.schoolId,
            code: newUnit.enrollment.course.code,
            version: newUnit.enrollment.course.version,
            studentTypeId: newUnit.enrollment.course.studentTypeId,
            name: newUnit.enrollment.course.name,
            courseGuide: newUnit.enrollment.course.courseGuide,
            quizzesEnabled: newUnit.enrollment.course.quizzesEnabled,
            noTutor: newUnit.enrollment.course.noTutor,
            unitType: newUnit.enrollment.course.unitType,
            enabled: newUnit.enrollment.course.enabled,
            order: newUnit.enrollment.course.order,
            newUnitsEnabled: newUnit.enrollment.course.newUnitsEnabled,
            entityVersion: newUnit.enrollment.course.entityVersion,
          },
          student: {
            studentId: newUnit.enrollment.student.studentId,
            countryId: newUnit.enrollment.student.countryId,
            provinceId: newUnit.enrollment.student.provinceId,
            studentTypeId: newUnit.enrollment.student.studentTypeId,
            sex: newUnit.enrollment.student.sex,
            firstName: newUnit.enrollment.student.firstName,
            lastName: newUnit.enrollment.student.lastName,
            entityVersion: newUnit.enrollment.student.entityVersion,
            timestamp: newUnit.enrollment.student.timestamp,
          },
        },
        newAssignments: newUnit.newAssignments.map(a => {
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
          return {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            unitId: this.uuidService.binToUUID(a.unitId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            optional: a.optional,
            complete: assignmentComplete,
            points: assignmentPoints,
            mark: assignmentMarked ? assignmentMark : null,
            created: a.created,
            modified: a.modified,
          };
        }),
        complete: unitComplete,
        points: unitPoints,
        mark: unitMarked ? unitMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
