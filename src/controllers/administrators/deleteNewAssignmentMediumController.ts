import * as yup from 'yup';

import { deleteNewAssignmentMediumInteractor } from '../../interactors/administrators';
import type { DeleteNewAssignmentMediumResponseDTO } from '../../interactors/administrators/deleteNewAssignmentMediumInteractor';
import { DeleteNewAssignmentMediumNotFound, DeleteNewAssignmentMediumUnitsEnabled, DeleteNewAssignmentMediumUnlinkError } from '../../interactors/administrators/deleteNewAssignmentMediumInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    mediumId: string;
  };
};

type Response = DeleteNewAssignmentMediumResponseDTO;

export class DeleteNewAssignmentMediumController extends BaseController<Request, Response> {

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

    const result = await deleteNewAssignmentMediumInteractor.execute({ mediumId: params.mediumId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewAssignmentMediumNotFound:
        return this.notFound('Assignment medium not found');
      case DeleteNewAssignmentMediumUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case DeleteNewAssignmentMediumUnlinkError:
        return this.internalServerError('Could not unlink file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
