import { PasswordResetRequest, PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { AccountType } from '../../domain/account-type';
import { ICryptoService } from '../../services/crypto';
import { IDateService } from '../../services/date';
import { ILoggerService } from '../../services/logger';
import { IPasswordService } from '../../services/password';
import { Result, ResultType } from '../result';

type UsePasswordResetRequestDTO = {
  id: number;
  code: string;
  password: string;
};

type UsePasswordResetResponseDTO = void;

export class UsePasswordResetNotFound extends Error { }
export class UsePasswordResetInvalidCode extends Error { }
export class UsePasswordResetAlreadyUsed extends Error { }
export class UsePasswordResetExpired extends Error { }
export class UsePasswordResetPoorPassword extends Error { }
export class UsePasswordResetAccountNotFound extends Error { }
export class UsePasswordResetInvalidAccountType extends Error { }

export class UsePasswordResetInteractor implements IInteractor<UsePasswordResetRequestDTO, UsePasswordResetResponseDTO> {
  private static readonly expiryWindow = 1000 * 60 * 60 * 8; // 8 hours

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly cryptoService: ICryptoService,
    private readonly dateService: IDateService,
    private readonly passwordService: IPasswordService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, code, password }: UsePasswordResetRequestDTO): Promise<ResultType<UsePasswordResetResponseDTO>> {
    try {
      const passwordReset = await this.prisma.passwordResetRequest.findUnique({ where: { id } });

      if (passwordReset === null) {
        return Result.fail(new UsePasswordResetNotFound());
      }

      if (passwordReset.used) {
        return Result.fail(new UsePasswordResetAlreadyUsed());
      }

      if (passwordReset.code !== code) {
        return Result.fail(new UsePasswordResetInvalidCode());
      }

      if (this.isExpired(passwordReset)) {
        return Result.fail(new UsePasswordResetExpired());
      }

      if (this.passwordService.isPoor(password)) {
        return Result.fail(new UsePasswordResetPoorPassword());
      }

      const [ accountId, accountType ] = this.getAccountId(passwordReset);

      const passwordHash = await this.cryptoService.createHash(password, 13);

      if (accountType === 'admin') {
        await this.prisma.administrator.update({
          data: { passwordHash },
          where: { id: accountId },
        });
      } else if (accountType === 'tutor') {
        await this.prisma.tutor.update({
          data: { passwordHash },
          where: { id: accountId },
        });
      } else if (accountType === 'student') {
        await this.prisma.student.update({
          data: { passwordHash },
          where: { id: accountId },
        });
      } else {
        return Result.fail(new UsePasswordResetInvalidAccountType());
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error using password reset', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private isExpired(passwordReset: PasswordResetRequest): boolean {
    return this.dateService.getDate().getTime() >= passwordReset.requestDate.getTime() + UsePasswordResetInteractor.expiryWindow;
  }

  private getAccountId(passwordRest: PasswordResetRequest): [number, AccountType] {
    if (passwordRest.administratorId !== null) {
      return [ passwordRest.administratorId, 'admin' ];
    }
    if (passwordRest.tutorId !== null) {
      return [ passwordRest.tutorId, 'tutor' ];
    }
    if (passwordRest.studentId !== null) {
      return [ passwordRest.studentId, 'student' ];
    }
    throw new UsePasswordResetInvalidAccountType();
  }
}
