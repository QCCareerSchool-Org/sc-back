import * as yup from 'yup';

import type { GetNewMaterialUnitResponseDTO } from '../../interactors/administrators/getNewMaterialUnitInteractor.js';
import { GetNewMaterialUnitNotFound } from '../../interactors/administrators/getNewMaterialUnitInteractor.js';
import { getNewMaterialUnitInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialUnitId: string;
  };
};

type Response = GetNewMaterialUnitResponseDTO;

export class GetNewMaterialUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialUnitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await getNewMaterialUnitInteractor.execute({ materialUnitId: params.materialUnitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewMaterialUnitNotFound:
        return this.notFound('Material unit not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
