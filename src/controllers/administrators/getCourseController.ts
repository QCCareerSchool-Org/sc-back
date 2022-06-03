import * as yup from 'yup';

import type { GetCourseResponseDTO } from '../../interactors/administrators/getCourseInteractor.js';
import { GetCourseNotFound } from '../../interactors/administrators/getCourseInteractor.js';
import { getCourseInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    courseId: string;
  };
};

type Response = GetCourseResponseDTO;

export class GetCourseController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const courseId = parseInt(params.courseId, 10);

    const result = await getCourseInteractor.execute({ courseId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetCourseNotFound:
        return this.notFound('Course not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
