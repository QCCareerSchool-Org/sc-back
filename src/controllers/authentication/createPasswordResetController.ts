import * as yup from 'yup';

import { createPasswordResetInteractor } from '../../interactors/authentication';
import type { CreatePasswordResetResponseDTO } from '../../interactors/authentication/createPasswordResetInteractor';
import { CreatePasswordResetCountryNotFound, CreatePasswordResetNoEmailAddress, CreatePasswordResetUserNotFound } from '../../interactors/authentication/createPasswordResetInteractor';
import { BaseController } from '../baseController';

type Request = {
  body: {
    username: string;
  };
};

type Response = CreatePasswordResetResponseDTO;

export class CreatePasswordResetController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      username: yup.string().defined(),
    });
    try {
      const body = await bodySchema.validate(this.req.body);
      return { body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body }: Request): Promise<void> {
    const result = await createPasswordResetInteractor.execute({ username: body.username });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case CreatePasswordResetUserNotFound:
        return this.notFound('Username not found');
      case CreatePasswordResetNoEmailAddress:
        return this.badRequest('No email address on file');
      case CreatePasswordResetCountryNotFound:
        return this.badRequest('Country not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
