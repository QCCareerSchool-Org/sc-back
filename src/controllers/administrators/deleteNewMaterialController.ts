import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import type { DeleteNewMaterialResponseDTO } from '../../interactors/administrators/deleteNewMaterialInteractor.js';
import { DeleteNewMaterialNotFound } from '../../interactors/administrators/deleteNewMaterialInteractor.js';
import { deleteNewMaterialInteractor } from '../../interactors/administrators/index.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialId: string;
  };
  privileges?: Privileges;
};

type Response = DeleteNewMaterialResponseDTO;

export class DeleteNewMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      const params = await paramsSchema.validate(this.req.params);
      return { params, privileges: this.res.locals.jwt.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, privileges }: Request): Promise<void> {
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const result = await deleteNewMaterialInteractor.execute({ materialId: params.materialId, privileges });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case DeleteNewMaterialNotFound:
        return this.notFound('Not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
