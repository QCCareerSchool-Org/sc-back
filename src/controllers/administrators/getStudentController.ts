import * as yup from 'yup';

import type { GetStudentResponseDTO } from '../../interactors/administrators/getStudentInteractor.js';
import { GetStudentNotFound } from '../../interactors/administrators/getStudentInteractor.js';
import { getStudentInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    studentId: string;
  };
};

type Response = GetStudentResponseDTO;

export class GetStudentController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      return { params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);

    const result = await getStudentInteractor.execute({ studentId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetStudentNotFound:
        return this.notFound('Student not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
