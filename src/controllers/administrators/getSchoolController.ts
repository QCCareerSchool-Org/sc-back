import * as yup from 'yup';

import { getSchoolInteractor } from '../../interactors/administrators';
import type { GetSchoolResponseDTO } from '../../interactors/administrators/getSchoolInteractor';
import { GetSchoolNotFound } from '../../interactors/administrators/getSchoolInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    schoolId: string;
  };
};

type Response = GetSchoolResponseDTO;

export class GetSchoolController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await getSchoolInteractor.execute({ schoolId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetSchoolNotFound:
        return this.notFound('School not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
