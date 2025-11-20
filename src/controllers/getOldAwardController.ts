import * as yup from 'yup';

import type { GetOldAwardResponseDTO } from '../interactors/getOldAwardInteractor.js';
import { GetOldAwardGradeTooLow, GetOldAwardNoPoints, GetOldAwardNotFound, GetOldAwardNotMarked } from '../interactors/getOldAwardInteractor.js';
import { getOldAwardInteractor } from '../interactors/index.js';
import { BaseController } from './baseController.js';

type Request = {
  params: {
    submissionId: number;
  };
};

type Response = GetOldAwardResponseDTO;

export class GetOldAwardController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      submissionId: yup.number().integer().positive().defined(),
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

    const result = await getOldAwardInteractor.execute({ submissionId: params.submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetOldAwardNotFound:
      case GetOldAwardNotMarked:
      case GetOldAwardNoPoints:
      case GetOldAwardGradeTooLow:
        return this.notFound('Award not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
