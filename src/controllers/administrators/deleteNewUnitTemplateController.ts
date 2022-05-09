import * as yup from 'yup';

import { deleteNewUnitTemplateInteractor } from '../../interactors/administrators';
import type { DeleteNewUnitTemplateResponseDTO } from '../../interactors/administrators/deleteNewUnitTemplateInteractor';
import { DeleteNewUnitTemplateNotFound, DeleteNewUnitTemplateUnitsEnabled } from '../../interactors/administrators/deleteNewUnitTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    unitId: string;
  };
};

type Response = DeleteNewUnitTemplateResponseDTO;

export class DeleteNewUnitTemplateController extends BaseController<Request, Response> {

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
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const result = await deleteNewUnitTemplateInteractor.execute({ unitId: params.unitId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewUnitTemplateNotFound:
        return this.notFound('Unit template not found');
      case DeleteNewUnitTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
