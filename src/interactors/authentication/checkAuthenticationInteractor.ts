import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import * as yup from 'yup';

import type { AccessTokenPayload } from '../../domain/accessTokenPayload.js';
import type { AccountType } from '../../domain/accountType.js';
import type { StudentTypeType } from '../../domain/studentType.js';
import type { IJWTService } from '../../services/jwt/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

type CheckAuthenticationRequestDTO = {
  accessToken: string;
  xsrfToken?: string;
  checkXsrf: boolean;
};

type CheckAuthenticationResponseDTO = AccessTokenPayload;

abstract class CheckAuthenticationError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class CheckAuthenticationVerifyError extends CheckAuthenticationError { }
export class CheckAuthenticationInvalidPayload extends CheckAuthenticationError { }
export class CheckAuthenticationMissingXSRF extends CheckAuthenticationError { }
export class CheckAuthenticationInvalidXSRF extends CheckAuthenticationError { }

export class CheckAuthenticationInteractor implements IInteractor<CheckAuthenticationRequestDTO, CheckAuthenticationResponseDTO> {

  public constructor(
    private readonly jwtService: IJWTService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ accessToken, xsrfToken, checkXsrf }: CheckAuthenticationRequestDTO): Promise<ResultType<AccessTokenPayload>> {
    try {
      let decoded: unknown;
      try {
        decoded = await this.jwtService.verify(accessToken);
      } catch (err: unknown) {
        return failure(new CheckAuthenticationVerifyError());
      }

      const schema = yup.object({ // const schema: yup.SchemaOf<AccessTokenPayload> = yup.object({
        studentCenter: yup.object({
          id: yup.number().defined(),
          type: yup.mixed().oneOf<AccountType>([ 'admin', 'tutor', 'student', 'auditor' ]).defined(),
          studentType: yup.mixed().oneOf<StudentTypeType>([ 'general', 'event', 'design', 'writing' ]),
          privileges: yup.object({
            unitPrice: yup.boolean(),
            courseDevelopment: yup.boolean(),
          }),
        }).defined(),
        crm: yup.object({
          id: yup.number().defined(),
          type: yup.mixed().oneOf<'student' | 'admin'>([ 'admin', 'student' ]).defined(),
        }).default(undefined),
        exp: yup.number().defined(),
        xsrf: yup.string().defined(),
      });

      let accessTokenPayload: AccessTokenPayload;
      try {
        accessTokenPayload = await schema.validate(decoded);
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(err.message);
        }
        return failure(new CheckAuthenticationInvalidPayload());
      }

      if (checkXsrf) {
        if (typeof xsrfToken === 'undefined') {
          return failure(new CheckAuthenticationMissingXSRF());
        }
        if (xsrfToken !== accessTokenPayload.xsrf) {
          return failure(new CheckAuthenticationInvalidXSRF());
        }
      }

      return success<CheckAuthenticationResponseDTO>(accessTokenPayload);

    } catch (err) {
      this.logger.error('error checking authentication', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
