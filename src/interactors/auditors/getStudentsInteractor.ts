import type { Prisma, PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { StudentDTO } from '../../domain/auditors/studentDTO.js';
import type { CountryDTO } from '../../domain/countryDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { ProvinceDTO } from '../../domain/provinceDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type FilterConditions = {
  name?: string;
  group?: string;
  location?: string;
};

export type GetStudentsRequestDTO = {
  auditorId: number;
  filter?: FilterConditions;
};

export type GetStudentsResponseDTO = Array<StudentDTO & {
  country: CountryDTO;
  province: ProvinceDTO | null;
  enrollments: Array<EnrollmentDTO & { course: CourseDTO }>;
  groups: string[];
}>;

abstract class GetStudentsError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class AuditorNotFound extends GetStudentsError { }

export class GetStudentsInteractor implements IInteractor<GetStudentsRequestDTO, GetStudentsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ auditorId, filter }: GetStudentsRequestDTO): Promise<ResultType<GetStudentsResponseDTO>> {
    try {
      const studentsWhere: Prisma.AuditorsOnStudentsWhereInput = {};
      if (filter) {
        studentsWhere.AND = [];
        if (filter.name) {
          studentsWhere.AND.push({
            student: {
              OR: [
                { firstName: { contains: filter.name } },
                { lastName: { contains: filter.name } },
              ],
            },
          });
        }
        if (filter.location) {
          studentsWhere.AND.push({
            student: {
              OR: [
                { province: { name: { contains: filter.location } } },
                { country: { name: { contains: filter.location } } },
              ],
            },
          });
        }
        if (filter.group) {
          studentsWhere.AND.push({
            student: {
              groups: { some: { group: { name: { contains: filter.group } } } },
            },
          });
        }
      }

      const auditor = await this.prisma.auditor.findFirst({
        where: { auditorId },
        include: {
          students: {
            where: studentsWhere,
            include: {
              student: {
                include: {
                  country: true,
                  province: true,
                  enrollments: { include: { course: true } },
                  groups: { include: { group: true } },
                },
              },
            },
          },
        },
      });

      if (!auditor) {
        return failure(new AuditorNotFound());
      }

      return success(auditor.students.map(s => ({
        studentId: s.student.studentId,
        countryId: s.student.countryId,
        provinceId: s.student.provinceId,
        studentTypeId: s.student.studentTypeId,
        passwordChanged: s.student.passwordChanged,
        sex: s.student.sex,
        firstName: s.student.firstName,
        lastName: s.student.lastName,
        numLogins: s.student.numLogins,
        lastLogin: this.dateService.fixPrismaReadDate(s.student.lastLogin),
        expiry: this.dateService.fixPrismaReadDate(s.student.expiry),
        emailAddress: undefined,
        arrears: s.student.arrears,
        forumUsername: s.student.forumUsername,
        apiUsername: s.student.apiUsername,
        questionnaire: s.student.questionnaire,
        videoViewed: s.student.videoViewed,
        ajaxUploads: s.student.ajaxUploads,
        upgradeNotification: s.student.upgradeNotification,
        entityVersion: s.student.entityVersion,
        created: this.dateService.fixPrismaReadDate(s.student.created),
        modified: this.dateService.fixPrismaReadDate(s.student.modified),
        country: {
          countryId: s.student.country.countryId,
          code: s.student.country.code,
          name: s.student.country.name,
          entityVersion: s.student.country.entityVersion,
        },
        province: s.student.province === null ? null : {
          provinceId: s.student.province.provinceId,
          countryId: s.student.province.countryId,
          regionId: s.student.province.regionId,
          code: s.student.province.code,
          name: s.student.province.name,
          regionCode: s.student.province.regionCode,
          alternateAbbreviation: s.student.province.alternateAbbreviation,
          type: s.student.province.type,
          entityVersion: s.student.province.entityVersion,
        },
        enrollments: s.student.enrollments.map(e => ({
          enrollmentId: e.enrollmentId,
          courseId: e.courseId,
          studentId: e.studentId,
          studentNumber: e.studentNumber,
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
          enrollmentDate: this.dateService.fixPrismaReadDate(e.enrollmentDate),
          dueDate: this.dateService.fixPrismaReadDate(e.dueDate),
          fastTrack: e.fastTrack,
          paymentsDisabled: e.paymentsDisabled,
          course: {
            courseId: e.course.courseId,
            schoolId: e.course.schoolId,
            variantId: e.course.variantId,
            code: e.course.code,
            version: e.course.version,
            studentTypeId: e.course.studentTypeId,
            name: e.course.name,
            courseGuide: e.course.courseGuide,
            quizzesEnabled: e.course.quizzesEnabled,
            noTutor: e.course.noTutor,
            submissionType: e.course.submissionType,
            order: e.course.order,
            enabled: e.course.enabled,
            submissionsEnabled: e.course.submissionsEnabled,
            entityVersion: e.course.entityVersion,
          },
        })),
        groups: s.student.groups.map(g => g.group.name),
      })));

    } catch (err) {
      this.logger.error('error getting students', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
