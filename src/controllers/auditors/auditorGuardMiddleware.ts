import * as yup from 'yup';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';

import { BaseMiddleware } from '../baseMiddleware.js';

type Request = {
  params: {
    /** numeric string */
    auditorId: string;
  };
};

export class AuditorGuardMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      auditorId: yup.string().matches(/^\d+$/u).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      return { params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async executeImpl({ params }: Request): Promise<void> {
    const auditorId = parseInt(params.auditorId, 10);
    if (this.isAllowed(auditorId)) {
      return this.next();
    }
    this.forbidden();
  }

  private isAllowed(auditorId: number): boolean {
    if (isAccessTokenPayload(this.res.locals.jwt)) {
      if (this.res.locals.jwt.studentCenter.type === 'auditor' && this.res.locals.jwt.studentCenter.id === auditorId) {
        return true;
      }
      if (this.res.locals.jwt.studentCenter.type === 'admin') {
        return true;
      }
    }
    return false;
  }
}
