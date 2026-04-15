import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

type LogoutRequestDTO = {
  token: Buffer;
};

type LogoutResponseDTO = void;

export class LogoutTokenNotFound extends Error { }

export class LogoutInteractor implements IInteractor<LogoutRequestDTO, LogoutResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ token }: LogoutRequestDTO): Promise<ResultType<LogoutResponseDTO>> {
    try {

      const refreshToken = await this.prisma.refreshToken.findFirst({ where: { token } });
      if (!refreshToken) {
        return failure(new LogoutTokenNotFound());
      }

      await this.prisma.refreshToken.delete({ where: { token } });

      return success(undefined);

    } catch (err) {
      this.logger.error('error logging out', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
