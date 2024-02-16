import * as yup from 'yup';

import type { GetNewSubmissionResponseDTO } from '../../interactors/students/getNewSubmissionInteractor.js';
import { GetNewSubmissionNotFound } from '../../interactors/students/getNewSubmissionInteractor.js';
import { getNewSubmissionInteractor } from '../../interactors/students/index.js';
import { StudentController } from './index.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = GetNewSubmissionResponseDTO;

export class GetNewSubmissionController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const courseId = parseInt(params.courseId, 10);
    const { submissionId } = params;

    const result = await getNewSubmissionInteractor.execute({ studentId, courseId, submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case GetNewSubmissionNotFound:
        return this.notFound('Submission not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
