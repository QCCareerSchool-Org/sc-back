import * as yup from 'yup';

import type { GetPasswordResetResponseDTO } from '../../interactors/authentication/getPasswordResetInteractor.js';
import { GetPasswordResetInvalidCode, GetPasswordResetNotFound } from '../../interactors/authentication/getPasswordResetInteractor.js';
import { getPasswordResetInteractor } from '../../interactors/authentication/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    id: string;
  };
  query: {
    code: string;
  };
};

type Response = GetPasswordResetResponseDTO;

export class GetPasswordResetController extends BaseController<Request, Response> {

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
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetPasswordResetNotFound:
      case GetPasswordResetInvalidCode:
        return this.notFound('Password reset request not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
