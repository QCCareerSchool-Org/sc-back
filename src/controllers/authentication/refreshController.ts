import type { CookieOptions } from 'express';
import * as yup from 'yup';

import { AccessTokenPayload } from '../../domain/access-token-payload';
import { AccountType } from '../../domain/account-type';
import { refreshInteractor } from '../../interactors';
import { RefreshStudentInvalidType, RefreshStudentNotFound, RefreshTokenExpired, RefreshTokenInvalid, RefreshTokenInvalidType, RefreshTokenNotFound } from '../../interactors/authentication/refreshInteractor';
import { environmentConfigService } from '../../services';
import { BaseController } from '../baseController';

type Cookies = {
  refreshId: string;
  refreshType: AccountType;
  refreshToken: string;
};

export class RefreshController extends BaseController<Cookies, AccessTokenPayload> {

  protected async validate(): Promise<Cookies | false> {
    const cookiesSchema: yup.SchemaOf<Cookies> = yup.object({
      refreshToken: yup.string().defined(),
      refreshType: yup.mixed().oneOf<AccountType>([ 'admin', 'tutor', 'student' ]).defined(),
      refreshId: yup.string().defined().matches(/^\d+$/u),
    });
    try {
      return await cookiesSchema.validate(this.req.cookies);
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ refreshToken, refreshType, refreshId }: Cookies): Promise<void> {
    let id: bigint;
    try {
      id = BigInt(refreshId);
    } catch (err) {
      return this.badRequest('Invalid refresh id');
    }

    const token = Buffer.from(refreshToken, 'base64');

    const result = await refreshInteractor.execute({ id, type: refreshType, token });

    if (result.success) {
      const { accessTokenPayload, accessToken, xsrfToken } = result.value;

      // send the access token cookie and XSRF token cookie
      const accessCookieOptions: CookieOptions = {
        secure: environmentConfigService.config.environment !== 'development',
        httpOnly: true,
        path: '/api',
        maxAge: environmentConfigService.config.auth.accessTokenLifetime * 1000,
        domain: environmentConfigService.config.auth.cookieDomain,
        sameSite: 'strict',
      };
      this.res.cookie('XSRF-TOKEN', xsrfToken, { ...accessCookieOptions, path: '/', httpOnly: false }); // Angular needs to read this
      this.res.cookie('accessToken', accessToken, accessCookieOptions);

      return this.ok(accessTokenPayload);
    }

    switch (result.error.constructor) {
      case RefreshTokenInvalidType:
        return this.badRequest('Invalid refresh token type');
      case RefreshTokenExpired:
        return this.badRequest('Refresh token expired');
      case RefreshTokenNotFound:
      case RefreshTokenInvalid:
        return this.badRequest('Invalid refresh token');
      case RefreshStudentNotFound:
        return this.internalServerError('Unable to find associated student');
      case RefreshStudentInvalidType:
        return this.internalServerError('Invalid student type found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
