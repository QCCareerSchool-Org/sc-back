import type { PrismaClient } from '@prisma/client';

import type { CountryDTO } from '../../domain/countryDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { ProvinceDTO } from '../../domain/provinceDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { StudentDTO } from '../../domain/students/studentDTO.js';
import type { SurveyCompletionDTO } from '../../domain/surveyCompletionDTO.js';
import type { SurveyDTO } from '../../domain/surveyDTO.js';
import type { VariantDTO } from '../../domain/variantDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetStudentRequestDTO = {
  studentId: number;
};

export type GetStudentResponseDTO = StudentDTO & {
  country: CountryDTO;
  province: ProvinceDTO | null;
  enrollments: Array<EnrollmentDTO & {
    course: CourseDTO & {
      school: SchoolDTO;
      variant: VariantDTO | null;
    };
  }>;
  surveyCompletions: Array<SurveyCompletionDTO & {
    survey: SurveyDTO;
  }>;
};

export class GetStudentNotFound extends Error { }

export class GetStudentInteractor extends StudentInteractor<GetStudentRequestDTO, GetStudentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId }: GetStudentRequestDTO): Promise<ResultType<GetStudentResponseDTO>> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: {
          caSocialInsuranceNumber: true,
          enrollments: {
            include: { course: { include: { school: true, variant: true } } },
            where: { course: { enabled: true } },
            orderBy: [ { course: { school: { order: 'asc' } } }, { course: { order: 'asc' } } ],
          },
          country: true,
          province: true,
          surveyCompletions: { include: { survey: true } },
        },
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
        lastLogin: this.dateService.fixPrismaReadDate(student.lastLogin),
        expiry: this.dateService.fixPrismaReadDate(student.expiry),
        emailAddress: student.emailAddress,
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
        created: this.dateService.fixPrismaReadDate(student.created),
        modified: this.dateService.fixPrismaReadDate(student.modified),
        hasCASocialInsuranceNumber: !!student.caSocialInsuranceNumber,
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
          updated: e.updated,
          entityVersion: e.entityVersion,
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
            enabled: e.course.enabled,
            order: e.course.order,
            submissionsEnabled: e.course.submissionsEnabled,
            entityVersion: e.course.entityVersion,
            school: {
              schoolId: e.course.school.schoolId,
              name: e.course.school.name,
              slug: e.course.school.slug,
              order: e.course.school.order,
              entityVersion: e.course.school.entityVersion,
            },
            variant: e.course.variant === null ? null : {
              variantId: e.course.variant.variantId,
              name: e.course.variant.name,
            },
          },
        })),
        surveyCompletions: student.surveyCompletions.map(s => ({
          surveyCompletionId: this.uuidService.binToUUID(s.surveyCompletionId),
          surveyId: this.uuidService.binToUUID(s.surveyId),
          studentId: s.studentId,
          created: this.dateService.fixPrismaReadDate(s.created),
          modified: this.dateService.fixPrismaReadDate(s.modified),
          survey: {
            surveyId: this.uuidService.binToUUID(s.survey.surveyId),
            name: s.survey.name,
          },
        })),
      });

    } catch (err) {
      this.logger.error('error getting student', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
