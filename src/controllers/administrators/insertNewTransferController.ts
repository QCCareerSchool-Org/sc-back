import * as yup from 'yup';

import { insertNewTransferInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewTransferResponseDTO } from '../../interactors/administrators/insertNewTransferInteractor.js';
import { InsertNewTransferInvalidTutor, InsertNewTransferNoTutorAssigned, InsertNewTransferSubmissionAlreadyClosed, InsertNewTransferSubmissionNotFound } from '../../interactors/administrators/insertNewTransferInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionId: string;
  };
  body: {
    tutorId: number;
  };
};

type Response = InsertNewTransferResponseDTO;

export class InsertNewTransferController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      tutorId: yup.number().defined(),
    }) as unknown as yup.SchemaOf<Request['body']>;
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
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const administratorId = parseInt(params.administratorId, 10);

    const result = await insertNewTransferInteractor.execute({
      administratorId,
      submissionId: params.submissionId,
      tutorId: body.tutorId,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewTransferSubmissionNotFound:
        return this.notFound('Submission not found');
      case InsertNewTransferSubmissionAlreadyClosed:
        return this.conflict('Submission already closed');
      case InsertNewTransferNoTutorAssigned:
        return this.conflict('No tutor is assigned to this submission');
      case InsertNewTransferInvalidTutor:
        return this.badRequest('Invalid tutor');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
