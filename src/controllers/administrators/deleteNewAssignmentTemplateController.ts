import * as yup from 'yup';

import type { DeleteNewAssignmentTemplateResponseDTO } from '../../interactors/administrators/deleteNewAssignmentTemplateInteractor.js';
import { DeleteNewAssignmentTemplateNotFound, DeleteNewAssignmentTemplateUnitsEnabled } from '../../interactors/administrators/deleteNewAssignmentTemplateInteractor.js';
import { deleteNewAssignmentTemplateInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    assignmentId: string;
  };
};

type Response = DeleteNewAssignmentTemplateResponseDTO;

export class DeleteNewAssignmentTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await deleteNewAssignmentTemplateInteractor.execute({ assignmentId: params.assignmentId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewAssignmentTemplateNotFound:
        return this.notFound('Assignment template not found');
      case DeleteNewAssignmentTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
