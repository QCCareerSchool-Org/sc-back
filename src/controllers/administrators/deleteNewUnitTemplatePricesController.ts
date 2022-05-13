import * as yup from 'yup';
import type { Privileges } from '../../domain/accessTokenPayload';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload';
import { InsufficientPrivileges } from '../../interactors';

import { deleteNewUnitTemplatePricesInteractor } from '../../interactors/administrators';
import type { DeleteNewUnitTemplatePricesResponseDTO } from '../../interactors/administrators/deleteNewUnitTemplatePricesInteractor';
import { BaseController } from '../baseController';

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
  privileges?: Privileges;
};

type Response = DeleteNewUnitTemplatePricesResponseDTO;

export class DeleteNewUnitTemplatePricesController extends BaseController<Request, Response> {

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
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      return { params, query, privileges: this.res.locals.jwt.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, query, privileges }: Request): Promise<void> {
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const courseId = parseInt(params.courseId, 10);
    const countryId = typeof query.countryId === 'undefined' ? null : parseInt(query.countryId, 10);

    const result = await deleteNewUnitTemplatePricesInteractor.execute({ courseId, countryId, privileges });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
