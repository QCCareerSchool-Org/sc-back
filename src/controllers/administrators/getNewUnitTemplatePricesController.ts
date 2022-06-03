import * as yup from 'yup';

import type { GetNewUnitTemplatePricesResponseDTO } from '../../interactors/administrators/getNewUnitTemplatePricesInteractor.js';
import { GetNewUnitTemplatePricesCourseNotFound } from '../../interactors/administrators/getNewUnitTemplatePricesInteractor.js';
import { getNewUnitTemplatePricesInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    courseId: string;
  };
  query: {
    /** numeric string */
    countryId?: string;
  };
};

type Response = GetNewUnitTemplatePricesResponseDTO;

export class GetNewUnitTemplatePricesController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      countryId: yup.string().matches(/^\d+$/u),
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

    const courseId = parseInt(params.courseId, 10);
    const countryId = typeof query.countryId === 'undefined' ? null : parseInt(query.countryId, 10);

    const result = await getNewUnitTemplatePricesInteractor.execute({ courseId, countryId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewUnitTemplatePricesCourseNotFound:
        return this.notFound('Course not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
