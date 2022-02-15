import * as yup from 'yup';

import { BaseMiddleware } from '../baseMiddleware';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
  };
};

export class StudentGuardMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
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
    const studentId = parseInt(params.studentId, 10);
    if (this.isAllowed(studentId)) {
      return this.next();
    }
    this.forbidden();
  }

  private isAllowed(studentId: number): boolean {
    if (this.res.locals.jwt?.type === 'student' && this.res.locals.jwt?.id === studentId) {
      return true;
    }
    if (this.res.locals.jwt?.type === 'admin') {
      return true;
    }
    return false;
  }
}
