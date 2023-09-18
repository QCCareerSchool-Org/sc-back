import * as yup from 'yup';

import { updateNewSubmissionResponseProgressInteractor } from '../../interactors/students/index.js';
import type { UpdateNewSubmissionResponseProgressResponseDTO } from '../../interactors/students/updateNewSubmissionResponseProgressInteractor.js';
import { UpdateNewSubmissionResponseProgressGreaterThan100, UpdateNewSubmissionResponseProgressLessThanZero, UpdateNewSubmissionResponseProgressNotFound } from '../../interactors/students/updateNewSubmissionResponseProgressInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    submissionId: string;
    progress: number;
  };
};

type Response = UpdateNewSubmissionResponseProgressResponseDTO;

export class UpdateNewSubmissionResponseProgressController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      progress: yup.number().defined(),
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
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { submissionId } = params;

    const result = await updateNewSubmissionResponseProgressInteractor.execute({ studentId, courseId, submissionId, progress: params.progress });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case UpdateNewSubmissionResponseProgressNotFound:
        return this.notFound('Submission not found');
      case UpdateNewSubmissionResponseProgressLessThanZero:
        return this.badRequest('Progress must be 0 or greater');
      case UpdateNewSubmissionResponseProgressGreaterThan100:
        return this.badRequest('Progress must be 100 or less');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
