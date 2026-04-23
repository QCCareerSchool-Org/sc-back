import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type UpdatePasswordRequestDTO = {
  auditorId: number;
  newPassword: string;
  newPasswordRepeat: string;
  password: string;
};

export type UpdatePasswordResponseDTO = void;

abstract class UpdatePasswordError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class AuditorNotFound extends UpdatePasswordError { }
export class AuditorExpired extends UpdatePasswordError { }
export class IncorrectPassword extends UpdatePasswordError { }
export class NewPasswordsDontMatch extends UpdatePasswordError { }

export class UpdatePasswordInteractor implements IInteractor<UpdatePasswordRequestDTO, UpdatePasswordResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ auditorId, newPassword, newPasswordRepeat, password }: UpdatePasswordRequestDTO): Promise<ResultType<UpdatePasswordResponseDTO>> {
    try {
      const auditor = await this.prisma.auditor.findFirst({
        where: { auditorId },
      });

      if (!auditor) {
        return failure(new AuditorNotFound());
      }

      if (auditor.expiry !== null && this.dateService.fixPrismaReadDate(auditor.expiry) <= this.dateService.getDate()) {
        return failure(new AuditorExpired());
      }

      if (!await this.cryptoService.verify(password, auditor.passwordHash)) {
        return failure(new IncorrectPassword());
      }

      if (newPassword !== newPasswordRepeat) {
        return failure(new NewPasswordsDontMatch());
      }

      await this.prisma.auditor.update({
        data: {
          passwordHash: await this.cryptoService.createHash(newPassword),
          passwordChanged: true,
        },
        where: { auditorId },
      });

      return success(undefined);

    } catch (err) {
      this.logger.error('error updating password', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
