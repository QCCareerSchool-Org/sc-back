import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { AccessTokenPayload } from '../../domain/accessTokenPayload.js';
import type { AccountType } from '../../domain/accountType.js';
import { isValidStudentType } from '../../domain/studentType.js';
import type { IInteractor } from '../../interactors/index.js';
import type { IConfigService } from '../../services/config/index.js';
import type { ICryptoService } from '../../services/crypto/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IJWTService } from '../../services/jwt/index.js';
import type { ILoggerService } from '../../services/logger/index.js';

export type RefreshRequestDTO = {
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

abstract class RefreshError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class RefreshTokenNotFound extends RefreshError { }
export class RefreshTokenExpired extends RefreshError { }
export class RefreshTokenInvalidType extends RefreshError { }
export class RefreshAccountNotFound extends RefreshError { }
export class RefreshStudentInvalidType extends RefreshError { }

export class RefreshInteractor implements IInteractor<RefreshRequestDTO, RefreshResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: IConfigService,
    private readonly dateService: IDateService,
    private readonly jwtService: IJWTService,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ token }: RefreshRequestDTO): Promise<ResultType<RefreshResponseDTO>> {
    try {
      // look up the refresh token
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: { student: true, administrator: true },
      });
      if (refreshToken === null) {
        return failure(new RefreshTokenNotFound());
      }

      // make sure it's not expired
      const properExpiry = this.dateService.fixPrismaReadDate(refreshToken.expiry);
      if (properExpiry < this.dateService.getDate()) {
        return failure(new RefreshTokenExpired());
      }

      // determine which account we're dealing with
      let accountId: number;
      let accountType: AccountType;
      if (refreshToken.administratorId !== null) {
        accountId = refreshToken.administratorId;
        accountType = 'admin';
      } else if (refreshToken.tutorId !== null) {
        accountId = refreshToken.tutorId;
        accountType = 'tutor';
      } else if (refreshToken.studentId !== null) {
        accountId = refreshToken.studentId;
        accountType = 'student';
      } else if (refreshToken.auditorId !== null) {
        accountId = refreshToken.auditorId;
        accountType = 'auditor';
      } else {
        return failure(new RefreshStudentInvalidType());
      }

      // determine when the new access token should expire
      const accessExp = Math.floor(this.dateService.getDate().getTime() / 1000) + this.configService.config.auth.accessTokenLifetime;

      // generate a cryptographically suitable pseudo-random value for the XSRF token
      const xsrfTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const xsrfTokenString = xsrfTokenBytes.toString('base64');

      // create a new jwt access token
      const accessTokenPayload: AccessTokenPayload = {
        studentCenter: {
          id: accountId,
          type: accountType,
        },
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
      };
      if (accountType === 'admin') {
        if (!refreshToken.administrator) {
          return failure(new RefreshAccountNotFound());
        }
        accessTokenPayload.studentCenter.privileges = {
          submissionPriceChange: refreshToken.administrator.submissionPricePriv,
          courseDevelopment: refreshToken.administrator.courseDevelopmentPriv,
          delete: refreshToken.administrator.deletePriv,
        };
        if (refreshToken.administrator.apiUsername !== null) {
          accessTokenPayload.crm = {
            id: refreshToken.administrator.apiUsername,
            type: 'admin',
          };
        }
      }
      if (accountType === 'student') { // add student-only data to payload
        if (!refreshToken.student) {
          return failure(new RefreshAccountNotFound());
        }
        if (isValidStudentType(refreshToken.student.studentTypeId)) {
          accessTokenPayload.studentCenter.studentType = refreshToken.student.studentTypeId;
          if (refreshToken.student.apiUsername !== null) {
            accessTokenPayload.crm = {
              id: refreshToken.student.apiUsername,
              type: 'student',
            };
          }
        } else {
          return failure(new RefreshStudentInvalidType());
        }
      }
      const accessToken = await this.jwtService.sign(accessTokenPayload);

      const baseCookieOptions = {
        secure: this.configService.config.environment === 'production',
        httpOnly: true,
        domain: this.configService.config.auth.cookieDomain,
        sameSite: 'strict',
      } as const;

      const accessCookieOptions = {
        ...baseCookieOptions,
        path: this.configService.config.auth.accessCookiePath ?? this.configService.config.auth.cookiePath,
        maxAge: this.configService.config.auth.accessTokenLifetime * 1000,
      };

      return success({
        accessTokenPayload,
        cookies: [
          { name: 'accessToken', value: accessToken, options: accessCookieOptions },
          { name: 'XSRF-TOKEN', value: xsrfTokenString, options: { ...accessCookieOptions, path: '/', httpOnly: false } }, // path '/' and httpOnly false for Angular CSRF
        ],
      });

    } catch (err) {
      this.logger.error('error refreshing user', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
