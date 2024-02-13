import * as yup from 'yup';

import type { GetStudentsResponseDTO } from '../../interactors/auditors/getStudentsInteractor.js';
import { getStudentsInteractor } from '../../interactors/auditors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    auditorId: string;
  };
};

type Response = GetStudentsResponseDTO;

export class GetStudentsController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      auditorId: yup.string().matches(/^\d+$/u).defined(),
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

    const auditorId = parseInt(params.auditorId, 10);

    const result = await getStudentsInteractor.execute({ auditorId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
