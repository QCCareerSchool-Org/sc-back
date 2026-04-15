import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { StudentDTO } from '../../domain/students/studentDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailValidatorService } from '../../services/emailValidator/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type UpdateEmailAddressRequestDTO = {
  studentId: number;
  emailAddress: string;
};

export type UpdateEmailAddressResponseDTO = StudentDTO;

export class UpdateEmailAddressStudentNotFound extends Error { }
export class UpdateEmailAddressInvalidEmailAddress extends Error { }

export class UpdateEmailAddressInteractor extends StudentInteractor<UpdateEmailAddressRequestDTO, UpdateEmailAddressResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly emailValidator: IEmailValidatorService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, emailAddress }: UpdateEmailAddressRequestDTO): Promise<ResultType<UpdateEmailAddressResponseDTO>> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: { caSocialInsuranceNumber: true },
      });
      if (!student) {
        return failure(new UpdateEmailAddressStudentNotFound());
      }

      if (!this.emailValidator.validate(emailAddress)) {
        return failure(new UpdateEmailAddressInvalidEmailAddress());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updated = await this.prisma.student.update({
        where: { studentId },
        data: {
          emailAddress,
          modified: prismaNow,
          emailChanges: {
            create: { emailAddress },
          },
        },
        include: { caSocialInsuranceNumber: true },
      });

      return success({
        studentId: updated.studentId,
        countryId: updated.countryId,
        provinceId: updated.provinceId,
        studentTypeId: updated.studentTypeId,
        passwordChanged: updated.passwordChanged,
        sex: updated.sex,
        firstName: updated.firstName,
        lastName: updated.lastName,
        numLogins: updated.numLogins,
        lastLogin: this.dateService.fixPrismaReadDate(updated.lastLogin),
        expiry: this.dateService.fixPrismaReadDate(updated.expiry),
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
        created: this.dateService.fixPrismaReadDate(updated.created),
        modified: this.dateService.fixPrismaReadDate(updated.modified),
        hasCASocialInsuranceNumber: !!updated.caSocialInsuranceNumber,
      });

    } catch (err) {
      this.logger.error('error updating email address', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
