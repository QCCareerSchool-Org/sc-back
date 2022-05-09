import * as yup from 'yup';

import { getNewUnitTemplateInteractor } from '../../interactors/administrators';
import type { GetNewUnitTemplateResponseDTO } from '../../interactors/administrators/getNewUnitTemplateInteractor';
import { GetNewUnitTemplateNotFound } from '../../interactors/administrators/getNewUnitTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    unitId: string;
  };
};

type Response = GetNewUnitTemplateResponseDTO;

export class GetNewUnitTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await getNewUnitTemplateInteractor.execute({ unitId: params.unitId });

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
