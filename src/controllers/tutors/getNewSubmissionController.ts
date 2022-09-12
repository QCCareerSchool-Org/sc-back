import * as yup from 'yup';

import type { GetNewSubmissionResponseDTO } from '../../interactors/tutors/getNewSubmissionInteractor.js';
import { GetNewSubmissionNotFound, GetNewSubmissionNotSubmitted, GetNewSubmissionSkipped, GetNewSubmissionWrongTutor } from '../../interactors/tutors/getNewSubmissionInteractor.js';
import { getNewSubmissionInteractor } from '../../interactors/tutors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = GetNewSubmissionResponseDTO;

export class GetNewSubmissionController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
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

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { submissionId } = params;

    const result = await getNewSubmissionInteractor.execute({ tutorId, studentId, submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewSubmissionNotFound:
      case GetNewSubmissionNotSubmitted:
      case GetNewSubmissionSkipped:
        return this.notFound('Submission not found');
      case GetNewSubmissionWrongTutor:
        return this.forbidden('No access to this submission');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
