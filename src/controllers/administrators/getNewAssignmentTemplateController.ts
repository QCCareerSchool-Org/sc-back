import * as yup from 'yup';

import { getNewAssignmentTemplateInteractor } from '../../interactors/administrators';
import type { GetNewAssignmentTemplateResponseDTO } from '../../interactors/administrators/getNewAssignmentTemplateInteractor';
import { GetNewAssignmentTemplateNotFound } from '../../interactors/administrators/getNewAssignmentTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    assignmentId: string;
  };
  query: {
    inputs?: string;
  };
};

type Response = GetNewAssignmentTemplateResponseDTO;

export class GetNewAssignmentTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      inputs: yup.string(),
    });
    try {
      const [ params, query ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        querySchema.validate(this.req.query),
      ]);
      return { params, query };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, query }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const result = await getNewAssignmentTemplateInteractor.execute({ assignmentId: params.assignmentId, withInputs: !!query.inputs });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewAssignmentTemplateNotFound:
        return this.notFound('Assignment template not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
