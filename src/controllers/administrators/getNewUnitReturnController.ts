import * as yup from 'yup';

import type { GetNewSubmissionReturnResponseDTO } from '../../interactors/administrators/getNewSubmissionReturnInteractor.js';
import { GetNewSubmissionReturnNotFound, GetNewSubmissionReturnTutorNotFound } from '../../interactors/administrators/getNewSubmissionReturnInteractor.js';
import { getNewSubmissionReturnInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionReturnId: string;
  };
};

type Response = GetNewSubmissionReturnResponseDTO;

export class GetNewSubmissionReturnController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      submissionReturnId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await getNewSubmissionReturnInteractor.execute({ submissionReturnId: params.submissionReturnId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewSubmissionReturnNotFound:
        return this.notFound('Submission return not found');
      case GetNewSubmissionReturnTutorNotFound:
        return this.notFound('Tutor not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
