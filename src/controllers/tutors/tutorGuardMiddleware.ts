import * as yup from 'yup';

import { BaseMiddleware } from '../baseMiddleware';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
  };
};

export class TutorGuardMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
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
    const tutorId = parseInt(params.tutorId, 10);
    if (this.isAllowed(tutorId)) {
      return this.next();
    }
    this.forbidden();
  }

  private isAllowed(tutorId: number): boolean {
    if (typeof this.res.locals.jwt === 'object' && this.res.locals.jwt !== null) {
      const jwt = this.res.locals.jwt as Record<string, unknown>;
      if (jwt.type === 'tutor' && jwt.id === tutorId) {
        return true;
      }
      if (jwt.type === 'admin') {
        return true;
      }
    }
    return false;
  }
}
