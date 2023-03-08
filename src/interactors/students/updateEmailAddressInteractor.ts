import type { PrismaClient } from '@prisma/client';

import type { StudentDTO } from '../../domain/students/studentDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailValidatorService } from '../../services/emailValidator/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type UpdateEmailAddressRequestDTO = {
  studentId: number;
  emailAddress: string;
};

export type UpdateEmailAddressResponseDTO = StudentDTO;

export class UpdateEmailAddressStudentNotFound extends Error { }
export class UpdateEmailAddressInvalidEmailAddress extends Error { }

export class UpdateEmailAddressInteractor implements IInteractor<UpdateEmailAddressRequestDTO, UpdateEmailAddressResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly emailValidator: IEmailValidatorService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, emailAddress }: UpdateEmailAddressRequestDTO): Promise<ResultType<UpdateEmailAddressResponseDTO>> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: { caSocialInsuranceNumber: true },
      });
      if (!student) {
        return Result.fail(new UpdateEmailAddressStudentNotFound());
      }

      if (!this.emailValidator.validate(emailAddress)) {
        return Result.fail(new UpdateEmailAddressInvalidEmailAddress());
      }

      const localDate = this.dateService.getLocalDate() + 'Z'; // TODO: Update if Prisma ever gets timezones working properly

      const updated = await this.prisma.student.update({
        where: { studentId },
        data: {
          emailAddress,
          modified: localDate,
          emailChanges: {
            create: { emailAddress },
          },
        },
        include: { caSocialInsuranceNumber: true },
      });

      return Result.success({
        studentId: updated.studentId,
        countryId: updated.countryId,
        provinceId: updated.provinceId,
        studentTypeId: updated.studentTypeId,
        passwordChanged: updated.passwordChanged,
        sex: updated.sex,
        firstName: updated.firstName,
        lastName: updated.lastName,
        numLogins: updated.numLogins,
        lastLogin: updated.lastLogin,
        expiry: updated.expiry,
        emailAddress: updated.emailAddress,
        arrears: updated.arrears,
        forumUsername: updated.forumUsername,
        forumPasswordNew: updated.forumPasswordNew,
        apiUsername: updated.apiUsername,
        apiPasswordNew: updated.apiPasswordNew,
        questionnaire: updated.questionnaire,
        videoViewed: updated.videoViewed,
        ajaxUploads: updated.ajaxUploads,
        upgradeNotification: updated.upgradeNotification,
        entityVersion: updated.entityVersion,
        created: updated.created,
        modified: updated.modified,
        hasCASocialInsuranceNumber: !!updated.caSocialInsuranceNumber,
      });

    } catch (err) {
      this.logger.error('error updating email address', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
