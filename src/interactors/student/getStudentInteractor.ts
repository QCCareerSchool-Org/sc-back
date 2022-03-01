import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { CountryDTO } from '../../domain/countryDTO';
import { ProvinceDTO } from '../../domain/provinceDTO';
import { EnrollmentDTO } from '../../domain/student/enrollmentDTO';
import { StudentDTO } from '../../domain/student/studentDTO';
import type { ILoggerService } from '../../services/logger';
import { Result, ResultType } from '../result';

export type GetStudentRequestDTO = {
  studentId: number;
};

export type GetStudentResponseDTO = StudentDTO & {
  country: CountryDTO;
  province: ProvinceDTO | null;
  enrollments: EnrollmentDTO[];
};

export class GetStudentNotFound extends Error { }

export class GetStudentInteractor implements IInteractor<GetStudentRequestDTO, GetStudentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
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
