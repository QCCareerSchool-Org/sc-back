import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetStudentRequestDTO = {
  studentId: number;
};

export type GetStudentResponseDTO = {
  studentId: number;
  countryId: number;
  provinceId: number | null;
  studentTypeId: string;
  // passwordHash: string | null;
  // salt: string | null;
  // password: string | null;
  passwordChanged: boolean;
  sex: 'M' | 'F';
  firstName: string;
  lastName: string;
  numLogins: number;
  lastLogin: Date | null;
  expiry: Date | null;
  emailAddress: string | null;
  creationDate: Date;
  arrears: boolean;
  forumUsername: string | null;
  // forumPassword: string | null;
  // forumIV: Buffer | null;
  forumPasswordNew: string | null;
  apiUsername: number | null;
  // apiPassword: string | null;
  // apiIV: Buffer | null;
  apiPasswordNew: string | null;
  questionnaire: boolean;
  videoViewed: boolean;
  ajaxUploads: boolean;
  upgradeNotification: boolean;
  entityVersion: number;
  timestamp: Date;
  country: {
    countryId: number;
    code: string;
    name: string;
    entityVersion: number;
  };
  province: {
    provinceId: number;
    countryId: number;
    regionId: number | null;
    code: string;
    name: string;
    regionCode: string | null;
    alternateAbbreviation: string | null;
    type: string | null;
    entityVersion: number;
  } | null;
  enrollments: Array<{
    enrollmentId: number;
    courseId: number;
    studentNumber: number;
    studentId: number;
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
    updated: Date | null;
    entityVersion: number;
    timestamp: Date;
  }>;
};

export class GetStudentNotFound extends Error { }

export class GetStudentInteractor implements IInteractor<GetStudentRequestDTO, GetStudentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId }: GetStudentRequestDTO): Promise<ResultType<GetStudentResponseDTO>> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: { enrollments: true, country: true, province: true },
      });

      if (!student) {
        return Result.fail(new GetStudentNotFound());
      }

      return Result.success({
        studentId: student.studentId,
        countryId: student.countryId,
        provinceId: student.provinceId,
        studentTypeId: student.studentTypeId,
        passwordChanged: student.passwordChanged,
        sex: student.sex,
        firstName: student.firstName,
        lastName: student.lastName,
        numLogins: student.numLogins,
        lastLogin: student.lastLogin,
        expiry: student.expiry,
        emailAddress: student.emailAddress,
        creationDate: student.creationDate,
        arrears: student.arrears,
        forumUsername: student.forumUsername,
        forumPasswordNew: student.forumPasswordNew,
        apiUsername: student.apiUsername,
        apiPasswordNew: student.apiPasswordNew,
        questionnaire: student.questionnaire,
        videoViewed: student.videoViewed,
        ajaxUploads: student.ajaxUploads,
        upgradeNotification: student.upgradeNotification,
        entityVersion: student.entityVersion,
        timestamp: student.timestamp,
        country: {
          countryId: student.country.countryId,
          code: student.country.code,
          name: student.country.name,
          entityVersion: student.country.entityVersion,
        },
        province: student.province === null ? null : {
          provinceId: student.province.provinceId,
          countryId: student.province.countryId,
          regionId: student.province.regionId,
          code: student.province.code,
          name: student.province.name,
          regionCode: student.province.regionCode,
          alternateAbbreviation: student.province.alternateAbbreviation,
          type: student.province.type,
          entityVersion: student.province.entityVersion,
        },
        enrollments: student.enrollments.map(e => ({
          enrollmentId: e.enrollmentId,
          courseId: e.courseId,
          studentNumber: e.studentNumber,
          studentId: e.studentId,
          tutorId: e.tutorId,
          maxAssignments: e.maxAssignments,
          graduated: e.graduated,
          assignmentsDisabled: e.assignmentsDisabled,
          quizzesDisabled: e.quizzesDisabled,
          onHold: e.onHold,
          holdReason: e.holdReason,
          currencyCode: e.currencyCode,
          courseCost: e.courseCost.toNumber(),
          amountPaid: e.amountPaid.toNumber(),
          monthlyInstallment: e.monthlyInstallment === null ? null : e.monthlyInstallment.toNumber(),
          enrollmentDate: e.enrollmentDate,
          fastTrack: e.fastTrack,
          paymentsDisabled: e.paymentsDisabled,
          updated: e.updated,
          entityVersion: e.entityVersion,
          timestamp: e.timestamp,
        })),
      });

    } catch (err) {
      this.logger.error('error getting enrollment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
