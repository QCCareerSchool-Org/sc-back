import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { replaceNewUnitTemplatePricesInteractor } from '../../interactors/administrators/index.js';
import type { ReplaceNewUnitTemplatePricesResponseDTO } from '../../interactors/administrators/replaceNewUnitTemplatePricesInteractor.js';
import { ReplaceNewUnitTemplatePricesCourseNotFound, ReplaceNewUnitTemplatePricesMissingUnits } from '../../interactors/administrators/replaceNewUnitTemplatePricesInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
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
  body: {
    priceData: Array<{
      /** uuid */
      unitTemplateId: string;
      price: number;
      currencyId: number;
    }>;
  };
  privileges?: Privileges;
};

type Response = ReplaceNewUnitTemplatePricesResponseDTO;

export class ReplaceNewUnitTemplatePricesController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      countryId: yup.string().matches(/^\d+$/u),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      priceData: yup.array().of(yup.object({
        unitTemplateId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
        price: yup.number().positive().defined(),
        currencyId: yup.number().positive().integer().defined(),
      }).defined()),
    });
    try {
      const [ params, query, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        querySchema.validate(this.req.query),
        bodySchema.validate(this.req.body),
      ]);
      if (typeof body.priceData === 'undefined') {
        throw Error('priceData is undefined');
      }
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      return { params, query, body: body as Request['body'], privileges: this.res.locals.jwt.studentCenter.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, query, body, privileges }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const courseId = parseInt(params.courseId, 10);
    const countryId = typeof query.countryId === 'undefined' ? null : parseInt(query.countryId, 10);

    const result = await replaceNewUnitTemplatePricesInteractor.execute({
      courseId,
      countryId,
      priceData: body.priceData,
      privileges,
    });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case ReplaceNewUnitTemplatePricesCourseNotFound:
        return this.notFound('Course not found');
      case ReplaceNewUnitTemplatePricesMissingUnits:
        return this.badRequest('Some units missing');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
