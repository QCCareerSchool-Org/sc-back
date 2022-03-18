import * as yup from 'yup';

import { createPasswordResetInteractor } from '../../interactors/authentication';
import { CreatePasswordResetCountryNotFound, CreatePasswordResetNoEmailAddress, CreatePasswordResetUserNotFound } from '../../interactors/authentication/createPasswordResetInteractor';
import { BaseController } from '../baseController';

type Body = {
  username: string;
};

export class CreatePasswordResetController extends BaseController<Body, void> {

  protected async validate(): Promise<Body | false> {
    const bodySchema: yup.SchemaOf<Body> = yup.object({
      username: yup.string().defined(),
    });
    try {
      return await bodySchema.validate(this.req.body);
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ username }: Body): Promise<void> {
    const result = await createPasswordResetInteractor.execute({ username });

    if (result.success) {
      return this.noContent();
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
