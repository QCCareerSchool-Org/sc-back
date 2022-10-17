import * as yup from 'yup';

import { lessonGuardInteractor } from '../../interactors/students/index.js';
import { LessonGuardNotEnrolled } from '../../interactors/students/lessonGuardInteractor.js';
import { environmentConfigService } from '../../services/index.js';
import { BaseMiddleware } from '../baseMiddleware.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** uuid */
    materialId: string;
  };
};

export class LessonGuardMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await lessonGuardInteractor.execute({ studentId, materialId: params.materialId });
    if (result.success) {
      // const contentSecurityPolicy = environmentConfigService.config.environment === 'development'
      //   ? `default-src 'self' data: blob: gap: https://ssl.gstatic.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; media-src *; frame-ancestors *`
      //   : `default-src 'self' data: blob: gap: https://ssl.gstatic.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; media-src *; frame-ancestors https://studentcenter.qccareerschool.com`;
      // this.res.setHeader('Content-Security-Policy', contentSecurityPolicy);
      return this.next();
    }

    switch (result.error.constructor) {
      case LessonGuardNotEnrolled:
        return this.forbidden('Not enrolled in this course');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
