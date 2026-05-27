import * as yup from 'yup';
import { GetStudentContextNotFound, type GetStudentContextResponseDTO } from '../../interactors/students/getStudentContextInteractor.js';
import { getStudentContextInteractor } from '../../interactors/students/index.js';
import { StudentController } from './index.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
  };
};

type Response = GetStudentContextResponseDTO;

export class GetStudentContextController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
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

    const result = await getStudentContextInteractor.execute({ studentId });

    if (result.success) {
      return this.ok(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case GetStudentContextNotFound:
        return this.notFound('Student not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
