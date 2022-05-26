import * as yup from 'yup';

import { closeNewUnitReturnInteractor } from '../../interactors/administrators';
import type { CloseNewUnitReturnResponseDTO } from '../../interactors/administrators/closeNewUnitReturnInteractor';
import { CloseNewUnitReturnAdminCommentEmpty, CloseNewUnitReturnAlreadyCompleted, CloseNewUnitReturnNotFound } from '../../interactors/administrators/closeNewUnitReturnInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    unitReturnId: string;
  };
  body: {
    adminComment: string;
  };
};

type Response = CloseNewUnitReturnResponseDTO;

export class CloseNewUnitReturnController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      unitReturnId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      adminComment: yup.string().defined(),
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
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await closeNewUnitReturnInteractor.execute({
      unitReturnId: params.unitReturnId,
      adminComment: body.adminComment,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case CloseNewUnitReturnNotFound:
        return this.notFound('Unit return not found');
      case CloseNewUnitReturnAlreadyCompleted:
        return this.badRequest('Unit return already completed');
      case CloseNewUnitReturnAdminCommentEmpty:
        return this.badRequest('Administrator comment is empty');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
