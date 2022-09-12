import * as yup from 'yup';

import type { DeleteNewPartTemplateResponseDTO } from '../../interactors/administrators/deleteNewPartTemplateInteractor.js';
import { DeleteNewPartTemplateNotFound, DeleteNewPartTemplateSubmissionsEnabled } from '../../interactors/administrators/deleteNewPartTemplateInteractor.js';
import { deleteNewPartTemplateInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    partId: string;
  };
};

type Response = DeleteNewPartTemplateResponseDTO;

export class DeleteNewPartTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await deleteNewPartTemplateInteractor.execute({ partId: params.partId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewPartTemplateNotFound:
        return this.notFound('Part template not found');
      case DeleteNewPartTemplateSubmissionsEnabled:
        return this.badRequest('Submissions must be disabled');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
