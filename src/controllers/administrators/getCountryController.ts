import * as yup from 'yup';

import { getCountryInteractor } from '../../interactors/administrators';
import type { GetCountryResponseDTO } from '../../interactors/administrators/getCountryInteractor';
import { GetCountryNotFound } from '../../interactors/administrators/getCountryInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    countryId: string;
  };
};

type Response = GetCountryResponseDTO;

export class GetCountryController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      countryId: yup.string().matches(/^\d+$/u).defined(),
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

    const countryId = parseInt(params.countryId, 10);

    const result = await getCountryInteractor.execute({ countryId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetCountryNotFound:
        return this.notFound('Country not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
