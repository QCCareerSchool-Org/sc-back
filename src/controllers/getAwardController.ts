import * as yup from 'yup';

import type { GetAwardResponseDTO } from '../interactors/getAwardInteractor.js';
import { GetAwardGradeTooLow, GetAwardNoPoints, GetAwardNotFound, GetAwardNotMarked } from '../interactors/getAwardInteractor.js';
import { getAwardInteractor } from '../interactors/index.js';
import { BaseController } from './baseController.js';

type Request = {
  params: {
    /** uuid */
    submissionId: string;
  };
};

type Response = GetAwardResponseDTO;

export class GetAwardController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
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

    const result = await getAwardInteractor.execute({ submissionId: params.submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetAwardNotFound:
      case GetAwardNotMarked:
      case GetAwardNoPoints:
      case GetAwardGradeTooLow:
        return this.notFound('Video not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
