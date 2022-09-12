import * as yup from 'yup';

import type { DeleteNewTextBoxTemplateResponseDTO } from '../../interactors/administrators/deleteNewTextBoxTemplateInteractor.js';
import { DeleteNewTextBoxTemplateNotFound, DeleteNewTextBoxTemplateSubmissionsEnabled } from '../../interactors/administrators/deleteNewTextBoxTemplateInteractor.js';
import { deleteNewTextBoxTemplateInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    textBoxId: string;
  };
};

type Response = DeleteNewTextBoxTemplateResponseDTO;

export class DeleteNewTextBoxTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      textBoxId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await deleteNewTextBoxTemplateInteractor.execute({ textBoxId: params.textBoxId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewTextBoxTemplateNotFound:
        return this.notFound('Text box template not found');
      case DeleteNewTextBoxTemplateSubmissionsEnabled:
        return this.badRequest('Submissions must be disabled');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
