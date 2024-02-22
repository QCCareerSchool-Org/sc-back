import type { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

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
        return Result.fail(new LogoutTokenNotFound());
      }

      await this.prisma.refreshToken.delete({ where: { token } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error logging out', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
