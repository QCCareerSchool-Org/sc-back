import type { Administrator, PasswordResetRequest, PrismaClient, Student, Tutor } from '@prisma/client';

import type { AccountType } from '../../domain/accountType.js';
import type { IInteractor } from '../../interactors/index.js';
import type { ResultType } from '../../interactors/result.js';
import { Result } from '../../interactors/result.js';
import type { IConfigService } from '../../services/config/index.js';
import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailService } from '../../services/email/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IStudentService } from '../../services/student/index.js';
import type { ITelephoneNumberService } from '../../services/telephoneNumber/index.js';

type CreatePasswordResetRequestDTO = {
  username: string;
};

export type CreatePasswordResetResponseDTO = {
  maskedEmailAddress: string;
  expiryDate: Date;
};

export class CreatePasswordResetUserNotFound extends Error { }
export class CreatePasswordResetNoEmailAddress extends Error { }
export class CreatePasswordResetInvalidAccountType extends Error { }
export class CreatePasswordResetCountryNotFound extends Error { }
export class CreatePasswordResetEmailFailure extends Error { }

type Account = Administrator | Tutor | Student;

export class CreatePasswordResetInteractor implements IInteractor<CreatePasswordResetRequestDTO, CreatePasswordResetResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly telephoneNumberService: ITelephoneNumberService,
    private readonly emailService: IEmailService,
    private readonly fileService: IFileService,
    private readonly cryptoService: ICryptoService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly studentService: IStudentService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ username }: CreatePasswordResetRequestDTO): Promise<ResultType<CreatePasswordResetResponseDTO>> {
    try {
      const lookup = await this.getAccount(username);

      if (!lookup) {
        return Result.fail(new CreatePasswordResetUserNotFound());
      }

      const [ accountId, account, accountType ] = lookup;

      if (!account.emailAddress) {
        return Result.fail(new CreatePasswordResetNoEmailAddress());
      }

      const randomBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const code = randomBytes.toString('hex');

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const passwordResetRequest = await this.prisma.passwordResetRequest.create({
        data: {
          administratorId: accountType === 'admin' ? accountId : null,
          tutorId: accountType === 'tutor' ? accountId : null,
          studentId: accountType === 'student' ? accountId : null,
          auditorId: accountType === 'auditor' ? accountId : null,
          username,
          code,
          used: false,
          requestDate: prismaNow,
          expiryDate: new Date(prismaNow.getTime() + (this.configService.config.passwordResetTimeout * 1000)),
          entityVersion: 0,
        },
      });

      let htmlBodyFile: string;
      let textBodyFile: string;
      if (accountType === 'admin') {
        htmlBodyFile = 'email/password-reset/administrator.html';
        textBodyFile = 'email/password-reset/administrator.txt';
      } else if (accountType === 'tutor') {
        htmlBodyFile = 'email/password-reset/tutor.html';
        textBodyFile = 'email/password-reset/tutor.txt';
      } else if (accountType === 'student' || accountType === 'auditor') {
        htmlBodyFile = 'email/password-reset/student.html';
        textBodyFile = 'email/password-reset/student.txt';
      } else {
        return Result.fail(new CreatePasswordResetInvalidAccountType());
      }

      // const headerImageFile = path.resolve(__dirname, '../../../email/header.png');
      const headerImageFile = 'email/header.png';

      const [ htmlBody, textBody, headerImage ] = await Promise.all([
        this.fileService.readFile(htmlBodyFile),
        this.fileService.readFile(textBodyFile),
        this.fileService.readFile(headerImageFile),
      ]);

      const country = await this.prisma.country.findUnique({ where: { countryId: account.countryId } });
      if (!country) {
        return Result.fail(new CreatePasswordResetCountryNotFound());
      }

      const name = account.firstName + ' ' + account.lastName;
      const telephoneNumber = this.telephoneNumberService.get(country.code);

      const replace = this.getReplaceFunction(name, telephoneNumber, passwordResetRequest);

      try {
        await this.emailService.send(
          name,
          account.emailAddress,
          'Password Reset Request',
          replace(htmlBody.toString('utf8')),
          replace(textBody.toString('utf8')),
          [ { content: headerImage, filename: 'header.png', cid: 'header' } ],
        );
      } catch (err) {
        this.logger.error('Email failure', err);
        return Result.fail(new CreatePasswordResetEmailFailure());
      }

      if (passwordResetRequest.expiryDate === null) {
        throw Error('password reset request expiry date is null');
      }

      return Result.success({
        maskedEmailAddress: this.emailService.mask(account.emailAddress),
        expiryDate: this.dateService.fixPrismaReadDate(passwordResetRequest.expiryDate),
      });

    } catch (err) {
      this.logger.error('error creating password reset', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  /**
   * Returns a function that will replace the variables in a template
   *
   * @param name the recipient's name
   * @param telephoneNumber the School's phone number
   * @param passwordResetRequest the password reset request
   * @returns the replacer function
   */
  private getReplaceFunction(name: string, telephoneNumber: string, passwordResetRequest: PasswordResetRequest): (template: string) => string {
    if (passwordResetRequest.expiryDate === null) {
      throw Error('password reset request expiry date is null');
    }
    const expiryDate = this.dateService.formatDateTime(passwordResetRequest.expiryDate);
    const resetLink = `https://${this.configService.config.host}/sc/password-resets/${encodeURIComponent(passwordResetRequest.id)}?code=${encodeURIComponent(passwordResetRequest.code)}`;

    return (template: string): string => template
      .replace('${name}', name)
      .replace('${telephoneNumber}', telephoneNumber)
      .replace('${expiryDate}', expiryDate)
      .replace('${resetLink}', resetLink);
  }

  private async getAccount(username: string): Promise<[number, Account, AccountType] | null> {
    const administrator = await this.prisma.administrator.findUnique({ where: { username } });
    if (administrator) {
      return [ administrator.administratorId, administrator, 'admin' ];
    }

    const tutor = await this.prisma.tutor.findUnique({ where: { username } });
    if (tutor) {
      return [ tutor.tutorId, tutor, 'tutor' ];
    }

    const [ courseCode, studentNumber ] = this.studentService.splitUsername(username);
    if (courseCode !== null && studentNumber !== null) {
      const student = await this.prisma.student.findFirst({
        where: {
          enrollments: {
            some: {
              course: { code: courseCode },
              studentNumber,
            },
          },
        },
      });
      if (student) {
        return [ student.studentId, student, 'student' ];
      }
    }

    // no admin, tutor, or student
    return null;
  }
}
