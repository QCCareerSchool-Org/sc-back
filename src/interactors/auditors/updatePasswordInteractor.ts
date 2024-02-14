import type { PrismaClient } from '@prisma/client';

import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type UpdatePasswordRequestDTO = {
  auditorId: number;
  newPassword: string;
  newPasswordRepeat: string;
  password: string;
};

export type UpdatePasswordResponseDTO = void;

export class AuditorNotFound extends Error { }
export class AuditorExpired extends Error { }
export class IncorrectPassword extends Error { }
export class NewPasswordsDontMatch extends Error { }

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
        return Result.fail(new AuditorNotFound());
      }

      if (auditor.expiry !== null && this.dateService.fixPrismaReadDate(auditor.expiry) <= this.dateService.getDate()) {
        return Result.fail(new AuditorExpired());
      }

      if (!await this.cryptoService.verify(password, auditor.passwordHash)) {
        return Result.fail(new IncorrectPassword());
      }

      if (newPassword !== newPasswordRepeat) {
        return Result.fail(new NewPasswordsDontMatch());
      }

      await this.prisma.auditor.update({
        data: {
          passwordHash: await this.cryptoService.createHash(newPassword),
          passwordChanged: true,
        },
        where: { auditorId },
      });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error updating password', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
