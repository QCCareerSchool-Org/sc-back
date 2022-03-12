import * as yup from 'yup';

import { getNewUnitTemplateInteractor } from '../../interactors/administrators';
import type { GetNewUnitTemplateResponseDTO } from '../../interactors/administrators/getNewUnitTemplateInteractor';
import { GetNewUnitTemplateNotFound } from '../../interactors/administrators/getNewUnitTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    schoolId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    unitId: string;
  };
};

type Response = GetNewUnitTemplateResponseDTO;

export class GetNewUnitTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId } = params;

    const result = await getNewUnitTemplateInteractor.execute({ schoolId, courseId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewUnitTemplateNotFound:
        return this.notFound('Unit template not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
