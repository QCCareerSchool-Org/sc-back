import * as yup from 'yup';

import { getEnrollmentInteractor } from '../../interactors';
import { GetEnrollmentNotFound, GetEnrollmentResponseDTO } from '../../interactors/student/getEnrollment';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
  };
  query: {
    /** numeric string */
    courseId: string;
  };
};

type Response = GetEnrollmentResponseDTO;

export class GetEnrollmentController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    try {
      const [ params, query ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        querySchema.validate(this.req.query),
      ]);
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
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(query.courseId, 10);

    const result = await getEnrollmentInteractor.execute({ studentId, courseId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetEnrollmentNotFound:
        return this.notFound('Enrollment not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
