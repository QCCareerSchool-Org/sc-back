import * as yup from 'yup';

import type { GetNewSubmissionResponseDTO } from '../../interactors/administrators/getNewSubmissionInteractor.js';
import { GetNewSubmissionNotFound } from '../../interactors/administrators/getNewSubmissionInteractor.js';
import { getNewSubmissionInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = GetNewSubmissionResponseDTO;

export class GetNewSubmissionController extends BaseController<Request, Response> {

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

    const result = await getNewSubmissionInteractor.execute({ submissionId: params.submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewSubmissionNotFound:
        return this.notFound('Submission not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
