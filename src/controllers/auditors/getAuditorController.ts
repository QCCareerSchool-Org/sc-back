import * as yup from 'yup';

import type { GetAuditorResponseDTO } from '../../interactors/auditors/getAuditorInteractor.js';
import { AuditorNotFound } from '../../interactors/auditors/getAuditorInteractor.js';
import { getAuditorInteractor } from '../../interactors/auditors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    auditorId: string;
  };
};

type Response = GetAuditorResponseDTO;

export class GetAuditorController extends BaseController<Request, Response> {

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

    const result = await getAuditorInteractor.execute({ auditorId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case AuditorNotFound:
        return this.notFound('Auditor not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
