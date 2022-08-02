import * as yup from 'yup';

import { updateEmailAddressInteractor } from '../../interactors/students/index.js';
import { UpdateEmailAddressInvalidEmailAddress, UpdateEmailAddressStudentNotFound } from '../../interactors/students/updateEmailAddressInteractor.js';
import type { UpdateEmailAddressResponseDTO } from '../../interactors/students/updateEmailAddressInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
  };
  body: {
    emailAddress: string;
  };
};

type Response = UpdateEmailAddressResponseDTO;

export class UpdateEmailAddressController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      emailAddress: yup.string().defined(),
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
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);

    const result = await updateEmailAddressInteractor.execute({ studentId, emailAddress: body.emailAddress });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case UpdateEmailAddressStudentNotFound:
        return this.notFound('Student not found');
      case UpdateEmailAddressInvalidEmailAddress:
        return this.badRequest('Invalid email address');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
