import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { IConfigService } from '../../services/config';
import { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';
import { unitIsComplete } from './unitIsComplete';

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
    courseId: number;
    code: string;
    name: string;
    courseGuide: boolean;
    quizzesEnabled: boolean;
    noTutor: boolean;
    unitType: number;
    units: Array<{
      unitId: number;
      courseId: number;
      unitLetter: string;
      title: string | null;
      responseType: 'mp3' | null;
      optional: boolean;
      noMarks: boolean;
      noAssignments: boolean;
      optionalUpload: boolean;
    }>;
    newUnits: Array<{
      /** uuid */
      unitId: string;
      courseId: number;
      unitLetter: string;
      title: string | null;
      description: string | null;
      optional: boolean;
      created: Date;
      modified: Date | null;
    }>;
  };
  tutor: {
    tutorId: number;
    firstName: string;
    lastName: string;
    introduction: boolean;
  } | null;
  units: Array<{
    unitId: number;
    enrollmentId: number;
    unitLetter: string;
    title: string | null;
    responseType: 'mp3' | null;
    responseFilename: string | null;
    points: number | null;
    mark: number | null;
    creationDate: Date;
    finalizedDate: Date | null;
    transferredDate: Date | null;
    tutorId: number | null;
    markedDate: Date | null;
    tutorComment: null; // always null for students
    adminComment: string | null;
    optional: boolean;
    noMarks: boolean;
    noAssignments: boolean;
    optionalUpload: boolean;
    order: number;
    skipped: boolean;
    cost: number | null;
    currencyId: number | null;
    audioProgress: number | null;
    entityVersion: number;
    timestamp: Date;
  }>;
  newUnits: Array<{
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
  }>;
};

export class GetEnrollmentNotFound extends Error { }

export class GetEnrollmentInteractor implements IInteractor<GetEnrollmentRequestDTO, GetEnrollmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
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
          newUnits: { include: { assignments: { include: { parts: { include: { textBoxes: true, uploadSlots: true } } } } } },
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
          courseId: enrollment.course.courseId,
          code: enrollment.course.code,
          name: enrollment.course.name,
          courseGuide: enrollment.course.courseGuide,
          quizzesEnabled: enrollment.course.quizzesEnabled,
          noTutor: enrollment.course.noTutor,
          unitType: enrollment.course.unitType,
          units: enrollment.course.units.map(unit => ({
            unitId: unit.unitId,
            courseId: unit.courseId,
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
            courseId: unit.courseId,
            unitLetter: unit.unitLetter,
            title: unit.title,
            description: unit.description,
            optional: unit.optional,
            created: unit.created,
            modified: unit.modified,
          })),
        },
        tutor: enrollment.tutor === null ? null : {
          tutorId: enrollment.tutor.tutorId,
          firstName: enrollment.tutor.firstName,
          lastName: enrollment.tutor.lastName,
          introduction: await this.isTutorIntroductionPresent(enrollment.tutorId, enrollment.course.code),
        },
        units: enrollment.units.map(unit => ({
          unitId: unit.unitId,
          enrollmentId: unit.enrollmentId,
          unitLetter: unit.unitLetter,
          title: unit.title,
          responseType: unit.responseType,
          responseFilename: unit.responseFilename,
          points: unit.points,
          mark: unit.mark,
          creationDate: unit.creationDate,
          finalizedDate: unit.finalizedDate,
          transferredDate: unit.transferredDate,
          tutorId: unit.tutorId,
          markedDate: unit.markedDate,
          tutorComment: null, // students should never see the tutor comment
          adminComment: unit.adminComment,
          optional: unit.optional,
          noMarks: unit.noMarks,
          noAssignments: unit.noAssignments,
          optionalUpload: unit.optionalUpload,
          order: unit.order,
          skipped: unit.skipped,
          cost: unit.cost?.toNumber() ?? null,
          currencyId: unit.currencyId,
          audioProgress: unit.audioProgress,
          timestamp: unit.timestamp,
          entityVersion: unit.entityVersion,
        })),
        newUnits: enrollment.newUnits.map(unit => ({
          unitId: this.uuidService.binToUUID(unit.unitId),
          enrollmentId: unit.enrollmentId,
          tutorId: unit.tutorId,
          unitLetter: unit.unitLetter,
          title: unit.title,
          description: unit.description,
          optional: unit.optional,
          complete: unitIsComplete(unit),
          adminComment: unit.adminComment,
          submitted: unit.submitted,
          skipped: unit.skipped,
          transferred: unit.transferred,
          marked: unit.marked,
          created: unit.created,
        })),
      });

    } catch (err) {
      this.logger.error('error getting enrollment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async isTutorIntroductionPresent(tutorId: number | null, courseCode: string): Promise<boolean> {
    if (tutorId === null) {
      return false;
    }
    const tutorAudioFileLocation = `${this.configService.config.paths.tutorIntroductionPath}/${tutorId}-${courseCode}`;
    const fileStats = await this.fileService.stat(tutorAudioFileLocation);
    if (fileStats) {
      return true;
    }
    return false;
  }
}
