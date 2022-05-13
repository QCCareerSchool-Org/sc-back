import type { Administrator, PrismaClient, Student, Tutor } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import type { AccountType } from '../../domain/accountType';
import { isValidStudentType } from '../../domain/studentType';
import type { IConfigService } from '../../services/config';
import type { ICryptoService } from '../../services/crypto';
import type { IDateService } from '../../services/date';
import type { IIPAddressService } from '../../services/ipaddress';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';
import type { IStudentService } from '../../services/student';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

type LoginRequestDTO = {
  username: string;
  password: string;
  stayLoggedIn?: boolean;
  ipAddress: string | null;
  browser: string | null;
  browserVersion: string | null;
  mobile: boolean | null;
  os: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
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

type LoginResponseDTO = {
  accessTokenPayload: AccessTokenPayload;
  cookies: Cookie[];
};

export class LoginNotFound extends Error { }
export class LoginNoPasswordHash extends Error { }
export class LoginWrongPassword extends Error { }

type Account = Administrator | Tutor | Student;

export class LoginInteractor implements IInteractor<LoginRequestDTO, LoginResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: IConfigService,
    private readonly dateService: IDateService,
    private readonly jwtService: IJWTService,
    private readonly cryptoService: ICryptoService,
    private readonly uuidService: IUUIDService,
    private readonly ipAddressService: IIPAddressService,
    private readonly studentService: IStudentService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: LoginRequestDTO): Promise<ResultType<LoginResponseDTO>> {
    try {
      const lookup = await this.getAccount(request.username);
      if (!lookup) {
        return Result.fail(new LoginNotFound());
      }

      const [ accountId, account, accountType ] = lookup;

      if (account.passwordHash === null) {
        return Result.fail(new LoginNoPasswordHash());
      }

      const passwordMatches = await this.cryptoService.verify(request.password, account.passwordHash);
      if (!passwordMatches) {
        return Result.fail(new LoginWrongPassword());
      }

      // determine when the access token should expire
      const accessExp = Math.floor(Date.now() / 1000) + this.configService.config.auth.accessTokenLifetime;

      // generate a cryptographically suitable pseudo-random value for the XSRF token
      const xsrfTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const xsrfTokenString = xsrfTokenBytes.toString('base64');

      // create a jwt access token
      const accessTokenPayload: AccessTokenPayload = {
        id: accountId,
        type: accountType,
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
      };
      if (accountType === 'admin') {
        const adminAccount = account as Administrator;
        accessTokenPayload.privileges = {
          unitPriceChange: adminAccount.unitPricePriv,
          courseDevelopment: adminAccount.courseDevelopmentPriv,
        };
      }
      if (accountType === 'student') { // add student-only data to payload
        const studentAccount = account as Student;
        if (isValidStudentType(studentAccount.studentTypeId)) {
          accessTokenPayload.studentType = studentAccount.studentTypeId;
          accessTokenPayload.crmId = studentAccount.apiUsername ?? undefined;
        }
      }
      const accessToken = await this.jwtService.sign(accessTokenPayload);

      // create a cryptographically suitable pseudo-random value for the refresh token
      const refreshTokenBytes = await this.cryptoService.randomBytes(64); // 64 * 8 = 512 bits of entropy
      const refreshTokenString = refreshTokenBytes.toString('base64');

      // store a the refresh token in the database
      await this.prisma.refreshToken.create({
        data: {
          refreshTokenId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          studentId: accountType === 'student' ? accountId : null,
          tutorId: accountType === 'tutor' ? accountId : null,
          administratorId: accountType === 'admin' ? accountId : null,
          token: refreshTokenBytes,
          expiry: new Date(this.dateService.getDate().getTime() + (this.configService.config.auth.refreshTokenLifetime * 1000)),
          ipAddress: request.ipAddress === null ? null : this.ipAddressService.parse(request.ipAddress),
          browser: request.browser,
          browserVersion: request.browserVersion,
          mobile: request.mobile,
          os: request.os,
          city: request.city,
          country: request.country,
          latitude: request.latitude === null ? null : new Decimal(request.latitude),
          longitude: request.longitude === null ? null : new Decimal(request.longitude),
          created: new Date(),
          modified: new Date(),
          entityVersion: 0,
        },
      });

      const baseCookieOptions = {
        secure: this.configService.config.environment !== 'development',
        httpOnly: true,
        domain: this.configService.config.auth.cookieDomain,
        sameSite: 'strict',
      } as const;

      const accessCookieOptions: CookieOptions = {
        ...baseCookieOptions,
        path: this.configService.config.environment !== 'development' ? '/api/v1' : '/v1', // strip proxy path prefix in development
        maxAge: this.configService.config.auth.accessTokenLifetime * 1000,
      };

      const refreshCookieOptions: CookieOptions = {
        ...baseCookieOptions,
        path: this.configService.config.environment !== 'development' ? '/api/v1/auth/refresh' : '/v1/auth/refresh', // strip proxy path prefix in development
      };

      if (request.stayLoggedIn) {
        refreshCookieOptions.maxAge = this.configService.config.auth.refreshTokenLifetime * 1000;
      }

      return Result.success({
        accessTokenPayload,
        cookies: [
          { name: 'accessToken', value: accessToken, options: accessCookieOptions },
          { name: 'XSRF-TOKEN', value: xsrfTokenString, options: { ...accessCookieOptions, path: '/', httpOnly: false } }, // path '/' and httpOnly false for Angular CSRF
          { name: 'refreshToken', value: refreshTokenString, options: refreshCookieOptions },
        ],
      });

    } catch (err) {
      this.logger.error('error authenticating user', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getAccount(username: string): Promise<[number, Account, AccountType] | null> {
    const administrator = await this.prisma.administrator.findUnique({ where: { username } });
    if (administrator) {
      return [ administrator.administratorId, administrator, 'admin' ];
    }

    const tutor = await this.prisma.tutor.findUnique({ where: { username } });
    if (tutor) {
      return [ tutor.tutorId, tutor, 'tutor' ];
    }

    const [ courseCode, studentNumber ] = this.studentService.splitUsername(username);
    if (courseCode !== null && studentNumber !== null) {
      const student = await this.prisma.student.findFirst({
        where: {
          enrollments: {
            some: {
              course: { code: courseCode },
              studentNumber,
            },
          },
        },
      });
      if (student) {
        return [ student.studentId, student, 'student' ];
      }
    }

    // no admin, tutor, or student
    return null;
  }
}
