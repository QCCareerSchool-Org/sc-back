import type { AdministratorRefreshToken, PrismaClient, StudentRefreshToken, TutorRefreshToken } from '@prisma/client';

import type { AccountType } from '../../domain/accountType.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

type LogoutRequestDTO = {
  id?: bigint;
  type?: AccountType;
  token?: Buffer;
};

type LogoutResponseDTO = void;

export class LogoutTokenNotFound extends Error { }
export class LogoutTokenInvalidType extends Error { }
export class LogoutTokenInvalid extends Error { }

type RefreshToken = AdministratorRefreshToken | TutorRefreshToken | StudentRefreshToken;

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

        await this.deleteRefreshToken(refreshToken, type);
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
  private async getRefreshToken(id: bigint, type: AccountType): Promise<RefreshToken> {
    if (type === 'admin') {
      const administratorRefreshToken = await this.prisma.administratorRefreshToken.findUnique({ where: { id } });
      if (administratorRefreshToken === null) {
        throw new LogoutTokenNotFound();
      }
      return administratorRefreshToken;
    }

    if (type === 'tutor') {
      const tutorRefreshToken = await this.prisma.tutorRefreshToken.findUnique({ where: { id } });
      if (tutorRefreshToken === null) {
        throw new LogoutTokenNotFound();
      }
      return tutorRefreshToken;
    }

    if (type === 'student') {
      const studentRefreshToken = await this.prisma.studentRefreshToken.findUnique({ where: { id } });
      if (studentRefreshToken === null) {
        throw new LogoutTokenNotFound();
      }
      return studentRefreshToken;
    }

    throw new LogoutTokenInvalidType();
  }

  /**
   * Deletes a refresh token
   *
   * @param refreshToken the refresh token
   * @param type the account type
   * @returns void, or false if not found
   */
  private async deleteRefreshToken(refreshToken: RefreshToken, type: AccountType): Promise<RefreshToken> {
    if (type === 'admin') {
      return this.prisma.administratorRefreshToken.delete({ where: { id: refreshToken.id } });
    }

    if (type === 'tutor') {
      return this.prisma.tutorRefreshToken.delete({ where: { id: refreshToken.id } });
    }

    if (type === 'student') {
      return this.prisma.studentRefreshToken.delete({ where: { id: refreshToken.id } });
    }

    throw new LogoutTokenInvalidType();
  }
}
