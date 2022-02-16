import type { BrowserDetectInfo } from 'browser-detect/dist/types/browser-detect.interface';
import type { CookieOptions } from 'express';
import type { CityResponse } from 'maxmind';
import * as yup from 'yup';

import { AccessTokenPayload } from '../../domain/access-token-payload';
import { loginInteractor } from '../../interactors';
import { LoginNoPasswordHash, LoginNotFound, LoginWrongPassword } from '../../interactors/authentication/loginInteractor';
import { environmentConfigService } from '../../services';
import { BaseController } from '../baseController';

type Request = {
  body: {
    username: string;
    password: string;
    stayLoggedIn?: boolean;
  };
};

export class LoginController extends BaseController<Request, AccessTokenPayload> {

  protected async validate(): Promise<Request | false> {
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      username: yup.string().required(),
      password: yup.string().required(),
      stayLoggedIn: yup.boolean(),
    });
    try {
      const body = await bodySchema.validate(this.req.body);
      return { body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body }: Request): Promise<void> {
    const { username, password, stayLoggedIn } = body;

    // read browser data from request (created by middleware)
    const browser = this.res.locals.browser as BrowserDetectInfo | undefined;

    // read location data from request (created by middleware)
    const location = this.res.locals.location as CityResponse | undefined;

    // read ip address data from request
    let ipAddress: string | null = null;
    const forwardedFor = this.req.headers['x-forwarded-for'];
    if (Array.isArray(forwardedFor) && forwardedFor.length) {
      ipAddress = forwardedFor[0];
    } else if (typeof forwardedFor === 'string') {
      ipAddress = forwardedFor.split(',')[0].trim();
    } else if (typeof this.req.socket.remoteAddress === 'string') {
      ipAddress = this.req.socket.remoteAddress;
    }

    const result = await loginInteractor.execute({
      username,
      password,
      stayLoggedIn,
      ipAddress,
      browser: browser?.name ?? null,
      browserVersion: browser?.version ?? null,
      mobile: browser?.mobile ?? null,
      os: browser?.os ?? null,
      city: location?.city?.names.en ?? null,
      country: location?.country?.iso_code ?? null,
      latitude: location?.location?.latitude ?? null,
      longitude: location?.location?.longitude ?? null,
    });

    if (result.success) {
      const { accessTokenPayload, accessToken, xsrfToken, refreshToken, refreshTokenId } = result.value;

      // send the access token cookie and XSRF token cookie
      const accessCookieOptions: CookieOptions = {
        secure: environmentConfigService.config.environment !== 'development',
        httpOnly: true,
        path: '/api',
        maxAge: environmentConfigService.config.auth.accessTokenLifetime * 1000,
        domain: environmentConfigService.config.auth.cookieDomain,
        sameSite: 'strict',
      };
      // Angular needs to read the XSRF-TOKEN cookie, otherwise we wouldn't send
      // it as a cookie and the client could read it from the response body
      this.res.cookie('XSRF-TOKEN', xsrfToken, { ...accessCookieOptions, path: '/', httpOnly: false });
      this.res.cookie('accessToken', accessToken, accessCookieOptions);

      // send the refresh token cookies
      const refreshCookieOptions: CookieOptions = {
        secure: environmentConfigService.config.environment !== 'development',
        httpOnly: true,
        path: '/api/auth',
        domain: environmentConfigService.config.auth.cookieDomain,
        sameSite: 'strict',
        // TODO: check that these are session cookies when no expires attribute is sent
      };
      if (stayLoggedIn) {
        refreshCookieOptions.maxAge = environmentConfigService.config.auth.refreshTokenLifetime * 1000;
      }
      this.res.cookie('refreshToken', refreshToken, refreshCookieOptions);
      this.res.cookie('refreshType', accessTokenPayload.type, refreshCookieOptions);
      this.res.cookie('refreshId', refreshTokenId, refreshCookieOptions);

      return this.ok(accessTokenPayload);
    }

    switch (result.error.constructor) {
      case LoginNoPasswordHash:
        return this.internalServerError('Password is stored in legacy format');
      case LoginWrongPassword:
      case LoginNotFound:
        // send this response for either error--we don't want an attacker to know whether
        // a username exists or not
        return this.badRequest('Invalid username or password');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
