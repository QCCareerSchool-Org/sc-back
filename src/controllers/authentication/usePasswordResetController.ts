import * as yup from 'yup';

import { usePasswordResetInteractor } from '../../interactors/authentication';
import { UsePasswordResetAlreadyUsed, UsePasswordResetExpired, UsePasswordResetInvalidCode, UsePasswordResetNotFound, UsePasswordResetPoorPassword } from '../../interactors/authentication/usePasswordResetInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    id: string;
  };
  body: {
    code: string;
    password: string;
  };
};

export class UsePasswordResetController extends BaseController<Request, void> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      id: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      code: yup.string().defined(),
      password: yup.string().defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      const body = await bodySchema.validate(this.req.body);
      return { params, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, body }: Request): Promise<void> {
    const result = await usePasswordResetInteractor.execute({
      id: parseInt(params.id, 10),
      code: body.code,
      password: body.password,
    });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case UsePasswordResetNotFound:
        return this.notFound('Password reset request not found');
      case UsePasswordResetInvalidCode:
        return this.badRequest('Invalid password reset request code');
      case UsePasswordResetAlreadyUsed:
        return this.badRequest('Password reset request has already been used');
      case UsePasswordResetExpired:
        return this.badRequest('Password reset request is expired');
      case UsePasswordResetPoorPassword:
        return this.badRequest('Password does not meet complexity requirements');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
