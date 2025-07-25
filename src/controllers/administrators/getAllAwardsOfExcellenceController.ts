import * as yup from 'yup';

import type { GetAllAwardsOfExcellenceResponseDTO } from '../../interactors/administrators/getAwardsOfExcellenceInteractor.js';
import { getAllAwardsOfExcellenceInteractor, getAllCountriesInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  query: {
    startDate: Date;
    endDate: Date;
  };
};

type Response = GetAllAwardsOfExcellenceResponseDTO;

export class GetAllAwardsOfExcellenceController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      startDate: yup.date().defined(),
      endDate: yup.date().defined(),
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

  protected async executeImpl({ query }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const result = await getAllAwardsOfExcellenceInteractor.execute(query);

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
