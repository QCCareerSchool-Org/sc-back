import * as yup from 'yup';

import type { GetNewSubmissionTemplateResponseDTO } from '../../interactors/administrators/getNewSubmissionTemplateInteractor.js';
import { GetNewSubmissionTemplateNotFound } from '../../interactors/administrators/getNewSubmissionTemplateInteractor.js';
import { getNewSubmissionTemplateInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = GetNewSubmissionTemplateResponseDTO;

export class GetNewSubmissionTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await getNewSubmissionTemplateInteractor.execute({ submissionId: params.submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewSubmissionTemplateNotFound:
        return this.notFound('Submission template not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
