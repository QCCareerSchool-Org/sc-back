import type { PasswordResetRequest, PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { AccountType } from '../../domain/accountType.js';
import type { IConfigService } from '../../services/config/index.js';
import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IPasswordService } from '../../services/password/index.js';
import type { IInteractor } from '../index.js';

type UsePasswordResetRequestDTO = {
  id: number;
  code: string;
  password: string;
};

type UsePasswordResetResponseDTO = void;

abstract class UsePasswordResetError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class UsePasswordResetNotFound extends UsePasswordResetError { }
export class UsePasswordResetInvalidCode extends UsePasswordResetError { }
export class UsePasswordResetAlreadyUsed extends UsePasswordResetError { }
export class UsePasswordResetExpired extends UsePasswordResetError { }
export class UsePasswordResetPoorPassword extends UsePasswordResetError { }
export class UsePasswordResetAccountNotFound extends UsePasswordResetError { }
export class UsePasswordResetInvalidAccountType extends UsePasswordResetError { }

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
        return failure(new UsePasswordResetNotFound());
      }

      if (passwordReset.used) {
        return failure(new UsePasswordResetAlreadyUsed());
      }

      if (passwordReset.code !== code) {
        return failure(new UsePasswordResetInvalidCode());
      }

      if (this.isExpired(passwordReset)) {
        return failure(new UsePasswordResetExpired());
      }

      if (this.passwordService.isPoor(password)) {
        return failure(new UsePasswordResetPoorPassword());
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
          } else if (accountType === 'auditor') {
            await transaction.auditor.update({
              data: { passwordHash },
              where: { auditorId: accountId },
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
          return failure(err);
        }
        throw err;
      }

      return success(undefined);

    } catch (err) {
      this.logger.error('error using password reset', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
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

  private getAccountId(passwordRest: PasswordResetRequest): [id: number, type: AccountType] {
    if (passwordRest.administratorId !== null) {
      return [ passwordRest.administratorId, 'admin' ];
    }
    if (passwordRest.tutorId !== null) {
      return [ passwordRest.tutorId, 'tutor' ];
    }
    if (passwordRest.auditorId !== null) {
      return [ passwordRest.auditorId, 'auditor' ];
    }
    if (passwordRest.studentId !== null) {
      return [ passwordRest.studentId, 'student' ];
    }
    throw new UsePasswordResetInvalidAccountType();
  }
}
