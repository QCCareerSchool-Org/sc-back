import * as yup from 'yup';
import { lessonGuardInteractor } from '../../interactors/students';
import { LessonGuardNotEnrolled } from '../../interactors/students/lessonGuardInteractor';

import { BaseMiddleware } from '../baseMiddleware';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
  };
};

export class LessonGuardMiddleware extends BaseMiddleware<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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
    const courseId = parseInt(params.courseId, 10);

    const result = await lessonGuardInteractor.execute({ studentId, courseId });
    if (result.success) {
      this.res.setHeader('Content-Security-Policy', `default-src 'self' data: blob: gap: https://ssl.gstatic.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; media-src *`);
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
