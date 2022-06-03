import * as yup from 'yup';

import type { GetNewMaterialResponseDTO } from '../../interactors/administrators/getNewMaterialInteractor.js';
import { GetNewMaterialNotFound } from '../../interactors/administrators/getNewMaterialInteractor.js';
import { getNewMaterialInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialId: string;
  };
};

type Response = GetNewMaterialResponseDTO;

export class GetNewMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const result = await getNewMaterialInteractor.execute({ materialId: params.materialId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewMaterialNotFound:
        return this.notFound('Not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
