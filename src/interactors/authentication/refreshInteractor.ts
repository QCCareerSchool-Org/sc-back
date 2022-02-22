import { AdministratorRefreshToken, PrismaClient, StudentRefreshToken, TutorRefreshToken } from '@prisma/client';
import { AccessTokenPayload } from '../../domain/access-token-payload';
import { AccountType } from '../../domain/account-type';
import { isValidStudentType } from '../../domain/student-type';
import { IInteractor } from '../../interactors/';
import { Result, ResultType } from '../../interactors/result';
import type { IConfigService } from '../../services/config';
import type { ICryptoService } from '../../services/crypto';
import { IDateService } from '../../services/date';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';

export type RefreshRequestDTO = {
  id: bigint;
  type: AccountType;
  token: Buffer;
};

type CookieOptions = {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

type Cookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export type RefreshResponseDTO = {
  accessTokenPayload: AccessTokenPayload;
  cookies: Cookie[];
};

export class RefreshTokenInvalidType extends Error {}
export class RefreshTokenNotFound extends Error {}
export class RefreshTokenExpired extends Error {}
export class RefreshTokenInvalid extends Error {}
export class RefreshStudentNotFound extends Error {}
export class RefreshStudentInvalidType extends Error {}

type RefreshToken = AdministratorRefreshToken | TutorRefreshToken | StudentRefreshToken;

export class RefreshInteractor implements IInteractor<RefreshRequestDTO, RefreshResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: IConfigService,
    private readonly dateService: IDateService,
    private readonly jwtService: IJWTService,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, type, token }: RefreshRequestDTO): Promise<ResultType<RefreshResponseDTO>> {
    try {

      // look up the refresh token
      let refreshToken: RefreshToken | null;
      if (type === 'admin') {
        refreshToken = await this.prisma.administratorRefreshToken.findUnique({ where: { id } });
      } else if (type === 'tutor') {
        refreshToken = await this.prisma.tutorRefreshToken.findUnique({ where: { id } });
      } else if (type === 'student') {
        refreshToken = await this.prisma.studentRefreshToken.findUnique({ where: { id } });
      } else {
        return Result.fail(new RefreshTokenInvalidType());
      }

      if (refreshToken === null) {
        return Result.fail(new RefreshTokenNotFound());
      }

      // make sure it's not expired
      if (refreshToken.expiry < this.dateService.getDate()) {
        return Result.fail(new RefreshTokenExpired());
      }

      // make sure the correct token was supplied
      if (!refreshToken.token.equals(token)) {
        return Result.fail(new RefreshTokenInvalid());
      }

      // determine when the new access token should expire
      const accessExp = Math.floor(this.dateService.getDate().getTime() / 1000) + this.configService.config.auth.accessTokenLifetime;

      // generate a cryptographically suitable pseudo-random value for the XSRF token
      const xsrfTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const xsrfTokenString = xsrfTokenBytes.toString('base64');

      // create a new jwt access token
      const accessTokenPayload: AccessTokenPayload = {
        id: refreshToken.accountId,
        type: type,
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
      };
      if (type === 'student') { // add student-only data to payload
        const student = await this.prisma.student.findUnique({ where: { studentId: refreshToken.accountId } });
        if (student === null) {
          return Result.fail(new RefreshStudentNotFound());
        }
        if (isValidStudentType(student.studentTypeId)) {
          accessTokenPayload.studentType = student.studentTypeId;
          accessTokenPayload.crmId = student.apiUsername ?? undefined;
        } else {
          return Result.fail(new RefreshStudentInvalidType());
        }
      }
      const accessToken = await this.jwtService.sign(accessTokenPayload);

      const baseCookieOptions = {
        secure: this.configService.config.environment !== 'development',
        httpOnly: true,
        domain: this.configService.config.auth.cookieDomain,
        sameSite: 'strict',
      } as const;

      const accessCookieOptions = {
        ...baseCookieOptions,
        path: this.configService.config.environment !== 'development' ? '/api' : '/', // strip prefix in development
        maxAge: this.configService.config.auth.accessTokenLifetime * 1000,
      };

      return Result.success({
        accessTokenPayload,
        cookies: [
          { name: 'accessToken', value: accessToken, options: accessCookieOptions },
          { name: 'XSRF-TOKEN', value: xsrfTokenString, options: { ...accessCookieOptions, path: '/', httpOnly: false } }, // httpOnly is false for Angular CSRF
        ],
      });

    } catch (err) {
      this.logger.error('error refreshing user', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
