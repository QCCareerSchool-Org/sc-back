import { Administrator, AdministratorRefreshToken, PrismaClient, Student, StudentRefreshToken, Tutor, TutorRefreshToken } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';

import { IInteractor } from '..';
import { AccessTokenPayload } from '../../domain/access-token-payload';
import { AccountType } from '../../domain/account-type';
import { isValidStudentType } from '../../domain/student-type';
import type { IConfigService } from '../../services/config';
import type { ICryptoService } from '../../services/crypto';
import { IDateService } from '../../services/date';
import type { IIPAddressService } from '../../services/ipaddress';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';
import { IStudentService } from '../../services/student';
import { Result, ResultType } from '../result';

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

type LoginResponseDTO = {
  accessTokenPayload: AccessTokenPayload;
  accessToken: string;
  xsrfToken: string;
  refreshToken: string;
  refreshTokenId: bigint;
};

export class LoginNotFound extends Error { }
export class LoginNoPasswordHash extends Error { }
export class LoginWrongPassword extends Error { }

type Account = Administrator | Tutor | Student;
type RefreshToken = AdministratorRefreshToken | TutorRefreshToken | StudentRefreshToken;

export class LoginInteractor implements IInteractor<LoginRequestDTO, LoginResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: IConfigService,
    private readonly dateService: IDateService,
    private readonly jwtService: IJWTService,
    private readonly cryptoService: ICryptoService,
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

      const [ account, accountType ] = lookup;

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
        id: account.id,
        type: accountType,
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
      };
      if (accountType === 'student') { // add student-only data to payload
        const studentAccount = account as Student;
        if (isValidStudentType(studentAccount.studentTypeType)) {
          accessTokenPayload.studentType = studentAccount.studentTypeType;
          accessTokenPayload.crmId = studentAccount.apiUsername ?? undefined;
        }
      }
      const accessToken = await this.jwtService.sign(accessTokenPayload);

      // create a cryptographically suitable pseudo-random value for the refresh token
      const refreshTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const refreshTokenString = refreshTokenBytes.toString('base64');

      const refreshTokenData: Omit<RefreshToken, 'id'> = {
        accountId: account.id,
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
      };

      // store a the refresh token in the database
      let refreshToken: RefreshToken;
      if (accountType === 'admin') {
        refreshToken = await this.prisma.administratorRefreshToken.create({ data: refreshTokenData });
      } else if (accountType === 'tutor') {
        refreshToken = await this.prisma.tutorRefreshToken.create({ data: refreshTokenData });
      } else if (accountType === 'student') {
        refreshToken = await this.prisma.studentRefreshToken.create({ data: refreshTokenData });
      } else {
        throw Error();
      }

      return Result.success({
        accessTokenPayload,
        accessToken,
        xsrfToken: xsrfTokenString,
        refreshToken: refreshTokenString,
        refreshTokenId: refreshToken.id,
      });

    } catch (err) {
      this.logger.error('error authenticating user', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getAccount(username: string): Promise<[Account, AccountType] | null> {
    const administrator = await this.prisma.administrator.findUnique({ where: { username } });
    if (administrator) {
      return [ administrator, 'admin' ];
    }

    const tutor = await this.prisma.tutor.findUnique({ where: { username } });
    if (tutor) {
      return [ tutor, 'tutor' ];
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
        return [ student, 'student' ];
      }
    }

    // no admin, tutor, or student
    return null;
  }
}
