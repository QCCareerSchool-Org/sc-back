import * as yup from 'yup';

import { CheckAuthenticationInvalidPayload, CheckAuthenticationInvalidXSRF, CheckAuthenticationMissingXSRF, CheckAuthenticationVerifyError } from '../../interactors/authentication/checkAuthenticationInteractor.js';
import { checkAuthenticationInteractor } from '../../interactors/authentication/index.js';
import { BaseMiddleware } from '../baseMiddleware.js';

type Request = {
  cookies: {
    accessToken: string;
  };
  headers: {
    'x-xsrf-token'?: string;
  };
};

export class CheckAuthenticationMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const cookiesSchema: yup.SchemaOf<Request['cookies']> = yup.object({
      accessToken: yup.string().defined(),
    });
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      'x-xsrf-token': yup.string(),
    });
    try {
      const [ cookies, headers ] = await Promise.all([
        cookiesSchema.validate(this.req.cookies),
        headersSchema.validate(this.req.headers),
      ]);
      return { cookies, headers };
    } catch (error) {
      if (error instanceof Error) {
        this.unauthorized(error.message);
      } else {
        this.unauthorized('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ cookies, headers }: Request): Promise<void> {
    const result = await checkAuthenticationInteractor.execute({
      accessToken: cookies.accessToken,
      xsrfToken: headers['x-xsrf-token'],
      checkXsrf: this.req.method !== 'HEAD' && this.req.method !== 'GET',
    });

    if (result.success) {
      this.res.locals.jwt = result.value; // store this for later use in other routes
      return this.next();
    }

    switch (result.error.constructor) {
      case CheckAuthenticationVerifyError:
        return this.unauthorized('Could not decode access token');
      case CheckAuthenticationInvalidPayload:
        return this.unauthorized('Invalid access token payload');
      case CheckAuthenticationMissingXSRF:
        return this.unauthorized('Missing XSRF token');
      case CheckAuthenticationInvalidXSRF:
        return this.unauthorized('Invalid XSRF token');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
