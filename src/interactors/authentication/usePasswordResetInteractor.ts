import type { PasswordResetRequest, PrismaClient } from '@prisma/client';

import type { AccountType } from '../../domain/accountType.js';
import type { IConfigService } from '../../services/config/index.js';
import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IPasswordService } from '../../services/password/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

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
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly cryptoService: ICryptoService,
    private readonly dateService: IDateService,
    private readonly passwordService: IPasswordService,
    private readonly configService: IConfigService,
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

      try {
        await this.prisma.$transaction(async transaction => {
          await transaction.passwordResetRequest.update({
            data: { used: true },
            where: { id },
          });

          if (accountType === 'admin') {
            await transaction.administrator.update({
              data: { passwordHash },
              where: { administratorId: accountId },
            });
          } else if (accountType === 'tutor') {
            await transaction.tutor.update({
              data: { passwordHash },
              where: { tutorId: accountId },
            });
          } else if (accountType === 'student') {
            await transaction.student.update({
              data: { passwordHash, passwordChanged: true },
              where: { studentId: accountId },
            });
          } else {
            throw new UsePasswordResetInvalidAccountType();
          }
        });
      } catch (err) {
        if (err instanceof Error) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error using password reset', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private isExpired(passwordReset: PasswordResetRequest): boolean {
    if (passwordReset.expiryDate) {
      const properExpiryDate = this.dateService.fixPrismaReadDate(passwordReset.expiryDate);
      return this.dateService.getDate() >= properExpiryDate;
    }
    const properRequestDate = this.dateService.fixPrismaReadDate(passwordReset.requestDate);
    return this.dateService.getDate().getTime() >= properRequestDate.getTime() + (this.configService.config.passwordResetTimeout * 1000);
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
