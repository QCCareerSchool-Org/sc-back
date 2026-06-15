import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { StudentDTO } from '../../domain/administrators/studentDTO.js';
import type { CountryDTO } from '../../domain/countryDTO.js';
import type { ProvinceDTO } from '../../domain/provinceDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type GetStudentRequestDTO = {
  studentId: number;
};

export type GetStudentResponseDTO = StudentDTO & {
  country: CountryDTO;
  provinvce: ProvinceDTO | null;
};

export class GetStudentNotFound extends Error { }

export class GetStudentInteractor implements IInteractor<GetStudentRequestDTO, GetStudentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId }: GetStudentRequestDTO): Promise<ResultType<GetStudentResponseDTO>> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: { country: true, province: true, tutorNote: true, adminNote: true },
      });
      if (!student) {
        return failure(new GetStudentNotFound());
      }

      return success({
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
        apiUsername: student.apiUsername,
        questionnaire: student.questionnaire,
        videoViewed: student.videoViewed,
        ajaxUploads: student.ajaxUploads,
        upgradeNotification: student.upgradeNotification,
        tutorNote: student.tutorNote?.note ?? null,
        adminNote: student.adminNote?.note ?? null,
        entityVersion: student.entityVersion,
        created: this.dateService.fixPrismaReadDate(student.created),
        modified: this.dateService.fixPrismaReadDate(student.modified),
        country: {
          countryId: student.country.countryId,
          code: student.country.code,
          name: student.country.name,
          entityVersion: student.country.entityVersion,
        },
        provinvce: student.province === null ? null : {
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
      });

    } catch (err) {
      this.logger.error('error getting student', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
