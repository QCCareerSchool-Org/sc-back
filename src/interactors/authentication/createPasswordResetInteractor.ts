import { Administrator, PasswordResetRequest, PrismaClient, Student, Tutor } from '@prisma/client';

import { AccountType } from '../../domain/account-type';
import { IInteractor } from '../../interactors';
import { Result, ResultType } from '../../interactors/result';
import type { ICryptoService } from '../../services/crypto';
import { IDateService } from '../../services/date';
import type { IEmailService } from '../../services/email';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import { IStudentService } from '../../services/student';
import type { ITelephoneNumberService } from '../../services/telephoneNumber';

type CreatePasswordResetRequestDTO = {
  username: string;
};

type CreatePasswordResetResponseDTO = void;

export class CreatePasswordResetUserNotFound extends Error { }
export class CreatePasswordResetNoEmailAddress extends Error { }
export class CreatePasswordResetAccountIdUndefined extends Error { }
export class CreatePasswordResetCountryNotFound extends Error { }
export class CreatePasswordResetIdUndefined extends Error { }

type Account = Administrator | Tutor | Student;

export class CreatePasswordResetInteractor implements IInteractor<CreatePasswordResetRequestDTO, CreatePasswordResetResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly telephoneNumberService: ITelephoneNumberService,
    private readonly emailService: IEmailService,
    private readonly fileService: IFileService,
    private readonly cryptoService: ICryptoService,
    private readonly dateService: IDateService,
    private readonly studentService: IStudentService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ username }: CreatePasswordResetRequestDTO): Promise<ResultType<CreatePasswordResetResponseDTO>> {
    try {
      const lookup = await this.getAccount(username);

      if (!lookup) {
        return Result.fail(new CreatePasswordResetUserNotFound());
      }

      const [ account, accountType ] = lookup;

      if (!account.emailAddress) {
        return Result.fail(new CreatePasswordResetNoEmailAddress());
      }

      const randomBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const code = randomBytes.toString('hex');

      if (typeof account.id === 'undefined') {
        return Result.fail(new CreatePasswordResetAccountIdUndefined());
      }

      const data: Omit<PasswordResetRequest, 'id'> = {
        administratorId: accountType === 'admin' ? account.id : null,
        tutorId: accountType === 'tutor' ? account.id : null,
        studentId: accountType === 'student' ? account.id : null,
        code,
        used: false,
        requestDate: this.dateService.getDate(),
        entityVersion: 0,
      };

      const passwordResetRequest = await this.prisma.passwordResetRequest.create({ data });

      const [ htmlBody, textBody, headerImage ] = await Promise.all([
        this.fileService.readFile('../../../email/password-reset.html'),
        this.fileService.readFile('../../../email/password-reset.txt'),
        this.fileService.readFile('../../../email/header.png'),
      ]);

      const country = await this.prisma.country.findUnique({ where: { id: account.countryId } });

      if (!country) {
        return Result.fail(new CreatePasswordResetCountryNotFound());
      }

      const name = account.firstName + ' ' + account.lastName;
      const telephoneNumber = this.telephoneNumberService.get(country.code);

      const replace = this.getReplaceFunction(name, telephoneNumber, passwordResetRequest);

      await this.emailService.send(
        name,
        account.emailAddress,
        'Password Reset Request',
        replace(htmlBody.toString('utf8')),
        replace(textBody.toString('utf8')),
        [ { content: headerImage, filename: 'header.png', cid: 'header' } ],
      );

      return Result.success(undefined);

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
    if (typeof passwordResetRequest.id === 'undefined') {
      throw new CreatePasswordResetIdUndefined();
    }

    const date = passwordResetRequest.requestDate.toISOString();
    const resetLink = `https://sc.qccareerschool.com/reset?id=${encodeURIComponent(passwordResetRequest.id)}&code=${encodeURIComponent(passwordResetRequest.code)}`;

    return (template: string): string => template.replace('${name}', name)
      .replace('${telephoneNumber}', telephoneNumber)
      .replace('${expiryDate}', date)
      .replace('${resetLink}', resetLink);
  }

  private async getAccount(username: string): Promise<[ Account, AccountType ] | null> {
    const administrator = await this.prisma.administrator.findUnique({ where: { username } });
    if (administrator) {
      return [ administrator, 'admin' ];
    }

    const tutor = await this.prisma.tutor.findUnique({ where: { username } });
    if (tutor) {
      return [ tutor, 'tutor' ];
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
        return [ student, 'student' ];
      }
    }

    // no admin, tutor, or student
    return null;
  }
}
