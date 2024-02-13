import type { PrismaClient, RefreshToken } from '@prisma/client';

import type { AccountType } from '../../domain/accountType.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

type LogoutRequestDTO = {
  id?: number;
  type?: AccountType;
  token?: Buffer;
};

type LogoutResponseDTO = void;

export class LogoutTokenNotFound extends Error { }
export class LogoutTokenInvalidType extends Error { }
export class LogoutTokenInvalid extends Error { }

export class LogoutInteractor implements IInteractor<LogoutRequestDTO, LogoutResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, type, token }: LogoutRequestDTO): Promise<ResultType<LogoutResponseDTO>> {
    try {

      if (typeof id !== 'undefined' && typeof type !== 'undefined' && typeof token !== 'undefined') {

        const refreshToken = await this.getRefreshToken(id, type);

        // don't wory if it's expired

        // make sure the correct token was supplied
        if (!refreshToken.token.equals(token)) {
          return Result.fail(new LogoutTokenInvalid());
        }

        await this.prisma.refreshToken.delete({ where: { refreshTokenId: token } });
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error logging out', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  /**
   * Retrieves a refresh token
   *
   * @param id the refresh token id
   * @param type the account type
   * @returns the refresh token
   */
  private async getRefreshToken(id: number, type: AccountType): Promise<RefreshToken> {
    let where;

    if (type === 'admin') {
      where = { administratorId: id };
    } else if (type === 'tutor') {
      where = { administratorId: id };
    } else if (type === 'auditor') {
      where = { auditorId: id };
    } else if (type === 'student') {
      where = { studentId: id };
    } else {
      throw new LogoutTokenInvalidType();
    }

    const refreshToken = await this.prisma.refreshToken.findFirst({ where });
    if (refreshToken === null) {
      throw new LogoutTokenNotFound();
    }
    return refreshToken;
  }
}
