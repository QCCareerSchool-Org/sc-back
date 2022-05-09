import * as yup from 'yup';

import { deleteNewPartMediumInteractor } from '../../interactors/administrators';
import type { DeleteNewPartMediumResponseDTO } from '../../interactors/administrators/deleteNewPartMediumInteractor';
import { DeleteNewPartMediumNotFound, DeleteNewPartMediumUnitsEnabled, DeleteNewPartMediumUnlinkError } from '../../interactors/administrators/deleteNewPartMediumInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    mediumId: string;
  };
};

type Response = DeleteNewPartMediumResponseDTO;

export class DeleteNewPartMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      mediumId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await deleteNewPartMediumInteractor.execute({ mediumId: params.mediumId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewPartMediumNotFound:
        return this.notFound('Part medium not found');
      case DeleteNewPartMediumUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case DeleteNewPartMediumUnlinkError:
        return this.internalServerError('Could not unlink file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
