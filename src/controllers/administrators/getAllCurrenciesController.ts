import * as yup from 'yup';

import { getAllCurrenciesInteractor } from '../../interactors/administrators';
import type { GetAllCurrenciesResponseDTO } from '../../interactors/administrators/getAllCurrenciesInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
};

type Response = GetAllCurrenciesResponseDTO;

export class GetAllCurrenciesController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

  protected async executeImpl(): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const result = await getAllCurrenciesInteractor.execute();

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
