import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type UpdateEmailAddressRequestDTO = {
  auditorId: number;
  emailAddress: string;
  password: string;
};

export type UpdateEmailAddressResponseDTO = void;

abstract class UpdateEmailAddressError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class UpdateEmailAddressAuditorNotFound extends UpdateEmailAddressError { }
export class UpdateEmailAddressAuditorExpired extends UpdateEmailAddressError { }
export class UpdateEmailAddressIncorrectPassword extends UpdateEmailAddressError { }

export class UpdateEmailAddressInteractor implements IInteractor<UpdateEmailAddressRequestDTO, UpdateEmailAddressResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ auditorId, emailAddress, password }: UpdateEmailAddressRequestDTO): Promise<ResultType<UpdateEmailAddressResponseDTO>> {
    try {
      const auditor = await this.prisma.auditor.findFirst({
        where: { auditorId },
      });

      if (!auditor) {
        return failure(new UpdateEmailAddressAuditorNotFound());
      }

      if (auditor.expiry !== null && this.dateService.fixPrismaReadDate(auditor.expiry) <= this.dateService.getDate()) {
        return failure(new UpdateEmailAddressAuditorExpired());
      }

      if (!await this.cryptoService.verify(password, auditor.passwordHash)) {
        return failure(new UpdateEmailAddressIncorrectPassword());
      }

      await this.prisma.auditor.update({
        data: { emailAddress },
        where: { auditorId },
      });

      return success(undefined);

    } catch (err) {
      this.logger.error('error updating email address', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
