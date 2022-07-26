import * as yup from 'yup';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';

import { BaseMiddleware } from '../baseMiddleware.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
};

export class AdministratorGuardMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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
    const administratorId = parseInt(params.administratorId, 10);
    if (this.isAllowed(administratorId)) {
      return this.next();
    }
    this.forbidden();
  }

  private isAllowed(administratorId: number): boolean {
    if (isAccessTokenPayload(this.res.locals.jwt)) {
      return this.res.locals.jwt.studentCenter.type === 'admin' && this.res.locals.jwt.studentCenter.id === administratorId;
    }
    return false;
  }
}
