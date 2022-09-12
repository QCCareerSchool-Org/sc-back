import * as yup from 'yup';

import type { CloseNewSubmissionReturnResponseDTO } from '../../interactors/administrators/closeNewSubmissionReturnInteractor.js';
import { CloseNewSubmissionReturnAdminCommentEmpty, CloseNewSubmissionReturnAlreadyCompleted, CloseNewSubmissionReturnNotFound } from '../../interactors/administrators/closeNewSubmissionReturnInteractor.js';
import { closeNewSubmissionReturnInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionReturnId: string;
  };
  body: {
    adminComment: string;
  };
};

type Response = CloseNewSubmissionReturnResponseDTO;

export class CloseNewSubmissionReturnController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      submissionReturnId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await closeNewSubmissionReturnInteractor.execute({
      submissionReturnId: params.submissionReturnId,
      adminComment: body.adminComment,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case CloseNewSubmissionReturnNotFound:
        return this.notFound('Submission return not found');
      case CloseNewSubmissionReturnAlreadyCompleted:
        return this.badRequest('Submission return already completed');
      case CloseNewSubmissionReturnAdminCommentEmpty:
        return this.badRequest('Administrator comment is empty');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
