import * as yup from 'yup';

import { AccountType } from '../../domain/accountType';
import { logoutInteractor } from '../../interactors';
import { LogoutTokenInvalid, LogoutTokenNotFound } from '../../interactors/authentication/logoutInteractor';
import { environmentConfigService } from '../../services';
import { BaseController } from '../baseController';

type Cookies = {
  refreshId?: string;
  refreshType?: AccountType;
  refreshToken?: string;
};

export class LogoutController extends BaseController<Cookies, void> {

  protected async validate(): Promise<Cookies | false> {
    const cookiesSchema: yup.SchemaOf<Cookies> = yup.object({
      refreshId: yup.string(),
      refreshType: yup.mixed().oneOf<AccountType>([ 'admin', 'tutor', 'student' ]),
      refreshToken: yup.string(),
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

  protected async executeImpl(cookies: Cookies): Promise<void> {
    let id: bigint | undefined = undefined;
    if (typeof cookies.refreshId !== 'undefined') {
      try {
        id = BigInt(cookies.refreshId);
      } catch (err) {
        return this.badRequest('Invalid refresh id');
      }
    }

    const token = typeof cookies.refreshToken === 'undefined' ? undefined : Buffer.from(cookies.refreshToken, 'base64');

    const result = await logoutInteractor.execute({ id, type: cookies.refreshType, token });

    this.clearCookies();

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case LogoutTokenNotFound:
      case LogoutTokenInvalid:
        return this.noContent(); // log out anyway
      default:
        return this.internalServerError(result.error.message);
    }
  }

  /**
   * Clear all authorization cookies
   */
  private clearCookies(): void {
    const secure = environmentConfigService.config.environment !== 'development';
    const sameSite = 'strict';
    const httpOnly = true;
    const domain = environmentConfigService.config.auth.cookieDomain;
    this.res.clearCookie('refeshToken', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('refreshType', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('refreshId', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('accessToken', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('XSRF-TOKEN', { secure, sameSite, httpOnly, domain });
  }
}
