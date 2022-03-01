import * as yup from 'yup';

import { AccessTokenPayload } from '../../domain/access-token-payload';
import { refreshInteractor } from '../../interactors';
import { RefreshStudentInvalidType, RefreshStudentNotFound, RefreshTokenExpired, RefreshTokenInvalidType, RefreshTokenNotFound } from '../../interactors/authentication/refreshInteractor';
import { BaseController } from '../baseController';

type Cookies = {
  refreshToken: string;
};

export class RefreshController extends BaseController<Cookies, AccessTokenPayload> {

  protected async validate(): Promise<Cookies | false> {
    const cookiesSchema: yup.SchemaOf<Cookies> = yup.object({
      refreshToken: yup.string().defined().matches(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u), // base64
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

  protected async executeImpl({ refreshToken }: Cookies): Promise<void> {
    const token = Buffer.from(refreshToken, 'base64');

    const result = await refreshInteractor.execute({ token });

    if (result.success) {
      const { accessTokenPayload, cookies } = result.value;

      // send all the cookies
      for (const c of cookies) {
        this.sendCookie(c.name, c.value, c.options.maxAge, c.options.path, c.options.domain, c.options.secure, c.options.httpOnly, c.options.sameSite);
      }

      // return the payload
      return this.ok(accessTokenPayload);
    }

    switch (result.error.constructor) {
      case RefreshTokenNotFound:
      case RefreshTokenExpired:
        return this.badRequest('Refresh token not found');
      case RefreshTokenInvalidType:
        return this.badRequest('Invalid refresh token type');
      case RefreshStudentNotFound:
        return this.internalServerError('Unable to find associated student');
      case RefreshStudentInvalidType:
        return this.internalServerError('Invalid student type found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
