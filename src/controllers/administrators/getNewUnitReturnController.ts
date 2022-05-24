import * as yup from 'yup';

import { getNewUnitReturnInteractor } from '../../interactors/administrators';
import type { GetNewUnitReturnResponseDTO } from '../../interactors/administrators/getNewUnitReturnInteractor';
import { GetNewUnitReturnNotFound, GetNewUnitReturnTutorNotFound } from '../../interactors/administrators/getNewUnitReturnInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    unitReturnId: string;
  };
};

type Response = GetNewUnitReturnResponseDTO;

export class GetNewUnitReturnController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      unitReturnId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await getNewUnitReturnInteractor.execute({ unitReturnId: params.unitReturnId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewUnitReturnNotFound:
        return this.notFound('Unit template not found');
      case GetNewUnitReturnTutorNotFound:
        return this.notFound('Tutor not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
