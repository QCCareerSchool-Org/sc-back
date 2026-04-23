import * as yup from 'yup';

import { updateEmailAddressInteractor } from '../../interactors/auditors/index.js';
import type { UpdateEmailAddressResponseDTO } from '../../interactors/auditors/updateEmailAddressInteractor.js';
import { UpdateEmailAddressAuditorExpired, UpdateEmailAddressAuditorNotFound, UpdateEmailAddressIncorrectPassword } from '../../interactors/auditors/updateEmailAddressInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    auditorId: string;
  };
  body: {
    emailAddress: string;
    password: string;
  };
};

type Response = UpdateEmailAddressResponseDTO;

export class UpdateEmailAddressController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      auditorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      emailAddress: yup.string().email().defined(),
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

    const result = await updateEmailAddressInteractor.execute({ auditorId, emailAddress: body.emailAddress, password: body.password });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case UpdateEmailAddressAuditorNotFound:
        return this.notFound('Auditor not found');
      case UpdateEmailAddressAuditorExpired:
        return this.unauthorized('Account is expired');
      case UpdateEmailAddressIncorrectPassword:
        return this.badRequest('Incorrect password');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
