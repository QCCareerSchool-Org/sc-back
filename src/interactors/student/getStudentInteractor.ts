import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetEnrollmentRequestDTO = {
  studentId: number;
  courseId: number;
};

export type GetEnrollmentResponseDTO = {
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
  course: {
    code: string;
    name: string;
    courseGuide: boolean;
    quizzesEnabled: boolean;
    noTutor: boolean;
    units: Array<{
      unitId: number;
      unitLetter: string;
      title: string | null;
      responseType: 'mp3' | null;
      optional: boolean;
      noMarks: boolean;
      noAssignments: boolean;
      optionalUpload: boolean;
    }>;
    newUnits: Array<{
      /** hex string */
      unitId: string;
    }>;
  };
  tutor: {
    tutorId: number;
  } | null;
  units: Array<{
    unitId: number;
  }>;
  newUnits: Array<{
    /** hex string */
    unitId: string;
  }>;
};

export class GetEnrollmentNotFound extends Error { }

export class GetEnrollmentInteractor implements IInteractor<GetEnrollmentRequestDTO, GetEnrollmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId }: GetEnrollmentRequestDTO): Promise<ResultType<GetEnrollmentResponseDTO>> {
    try {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: {
          course: {
            include: {
              // units: { where: { enabled: true }, orderBy: { order: 'asc' } },
              // newUnits: { orderBy: { unitLetter: 'asc' } },
              units: true,
              newUnits: true,
            },
          },
          tutor: true,
          // units: { orderBy: { order: 'asc' } },
          // newUnits: { orderBy: { unitLetter: 'asc' } },
          units: true,
          newUnits: true,

        },
      });

      if (!enrollment) {
        return Result.fail(new GetEnrollmentNotFound());
      }

      return Result.success({
        enrollmentId: enrollment.enrollmentId,
        courseId: enrollment.courseId,
        studentNumber: enrollment.studentNumber,
        tutorId: enrollment.tutorId,
        maxAssignments: enrollment.maxAssignments,
        graduated: enrollment.graduated,
        assignmentsDisabled: enrollment.assignmentsDisabled,
        quizzesDisabled: enrollment.quizzesDisabled,
        onHold: enrollment.onHold,
        holdReason: enrollment.holdReason,
        currencyCode: enrollment.currencyCode,
        courseCost: enrollment.courseCost.toNumber(),
        amountPaid: enrollment.amountPaid.toNumber(),
        monthlyInstallment: enrollment.monthlyInstallment?.toNumber() ?? null,
        enrollmentDate: enrollment.enrollmentDate,
        fastTrack: enrollment.fastTrack,
        paymentsDisabled: enrollment.paymentsDisabled,
        course: {
          code: enrollment.course.code,
          name: enrollment.course.name,
          courseGuide: enrollment.course.courseGuide,
          quizzesEnabled: enrollment.course.quizzesEnabled,
          noTutor: enrollment.course.noTutor,
          units: enrollment.course.units.map(unit => ({
            unitId: unit.unitId,
            unitLetter: unit.unitLetter,
            title: unit.title,
            responseType: unit.responseType,
            optional: unit.optional,
            noMarks: unit.noMarks,
            noAssignments: unit.noAssignments,
            optionalUpload: unit.optionalUpload,
          })),
          newUnits: enrollment.course.newUnits.map(unit => ({
            unitId: this.uuidService.binToUUID(unit.unitId),
          })),
        },
        tutor: enrollment.tutorId === null ? null : {
          tutorId: enrollment.tutorId,
        },
        units: [],
        newUnits: [],
      });

    } catch (err) {
      this.logger.error('error getting enrollment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
