import * as yup from 'yup';

import { updatePasswordInteractor } from '../../interactors/auditors/index.js';
import type { UpdatePasswordResponseDTO } from '../../interactors/auditors/updatePasswordInteractor.js';
import { AuditorExpired, AuditorNotFound, IncorrectPassword, NewPasswordsDontMatch } from '../../interactors/auditors/updatePasswordInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    auditorId: string;
  };
  body: {
    newPassword: string;
    newPasswordRepeat: string;
    password: string;
  };
};

type Response = UpdatePasswordResponseDTO;

export class UpdatePasswordController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      auditorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      newPassword: yup.string().defined(),
      newPasswordRepeat: yup.string().defined(),
      password: yup.string().defined(),
    });
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
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
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const auditorId = parseInt(params.auditorId, 10);

    const result = await updatePasswordInteractor.execute({ auditorId, newPassword: body.newPassword, newPasswordRepeat: body.newPasswordRepeat, password: body.password });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case AuditorNotFound:
        return this.notFound('Auditor not found');
      case AuditorExpired:
        return this.unauthorized('Account is expired');
      case IncorrectPassword:
        return this.badRequest('Incorrect password');
      case NewPasswordsDontMatch:
        return this.badRequest('Passwords don\'t match');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
