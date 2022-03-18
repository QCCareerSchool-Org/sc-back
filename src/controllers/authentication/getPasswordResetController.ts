import * as yup from 'yup';

import { getPasswordResetInteractor } from '../../interactors/authentication';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    id: string;
  };
  query: {
    code: string;
  };
};

export class GetPasswordResetController extends BaseController<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      id: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      code: yup.string().defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      const query = await querySchema.validate(this.req.query);
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
    const result = await getPasswordResetInteractor.execute({
      id: parseInt(params.id, 10),
      code: query.code,
    });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
