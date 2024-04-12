import * as yup from 'yup';

import { insertOrUpdateMetadataInteractor } from '../../interactors/students/index.js';
import type { InsertOrUpdateMetadataResponseDTO } from '../../interactors/students/insertOrUpdateMetadataInteractor.js';
import { InsertOrUpdateMetadataEnrollmentNotFound, InsertOrUpdateMetadataMetadataNotFound, InsertOrUpdateMetadataValueTooLong } from '../../interactors/students/insertOrUpdateMetadataInteractor.js';
import { StudentController } from './index.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
  };
  body: {
    name: string;
    value: string | null;
  };
};

type Response = InsertOrUpdateMetadataResponseDTO;

export class InsertOrUpdateMetadataController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      name: yup.string().defined(),
      value: yup.string().nullable().defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);

    const result = await insertOrUpdateMetadataInteractor.execute({ studentId, courseId, name: body.name, value: body.value });

    if (result.success) {
      return this.ok(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case InsertOrUpdateMetadataEnrollmentNotFound:
        return this.notFound('Enrollment not found');
      case InsertOrUpdateMetadataMetadataNotFound:
        return this.notFound('Metadata not found');
      case InsertOrUpdateMetadataValueTooLong:
        return this.badRequest('Value too long');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
