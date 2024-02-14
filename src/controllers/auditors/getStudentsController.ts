import * as yup from 'yup';

import type { GetStudentsResponseDTO } from '../../interactors/auditors/getStudentsInteractor.js';
import { getStudentsInteractor } from '../../interactors/auditors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    auditorId: string;
  };
  query: {
    filter?: {
      name?: string;
      location?: string;
      group?: string;
    };
  };
};

type Response = GetStudentsResponseDTO;

export class GetStudentsController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      auditorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      filter: yup.object({
        name: yup.string(),
        location: yup.string(),
        group: yup.string(),
      }),
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

    const auditorId = parseInt(params.auditorId, 10);

    const result = await getStudentsInteractor.execute({ auditorId, filter: query.filter });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
