import * as yup from 'yup';

import { enableCourseInteractor } from '../../interactors/administrators';
import type { EnableCourseResponseDTO } from '../../interactors/administrators/enableCourseInteractor';
import { EnableCourseNotFound, EnableCourseWrongUnitType } from '../../interactors/administrators/enableCourseInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    courseId: string;
  };
  body: {
    enable: boolean;
  };
};

type Response = EnableCourseResponseDTO;

export class EnableCourseController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      enable: yup.boolean().defined(),
    });
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const courseId = parseInt(params.courseId, 10);

    const result = await enableCourseInteractor.execute({ courseId, enable: body.enable });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case EnableCourseNotFound:
        return this.notFound('Course not found');
      case EnableCourseWrongUnitType:
        return this.badRequest('Wrong unit type');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
