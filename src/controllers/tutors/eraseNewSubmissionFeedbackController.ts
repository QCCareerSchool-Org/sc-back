import * as yup from 'yup';

import type { EraseNewSubmissionFeedbackResponseDTO } from '../../interactors/tutors/eraseNewSubmissionFeedbackInteractor.js';
import { EraseNewSubmissionFeedbackFileUnlinkError, EraseNewSubmissionFeedbackNotFound, EraseNewSubmissionFeedbackSubmissionAlreadyClosed, EraseNewSubmissionFeedbackSubmissionNotSubmitted, EraseNewSubmissionFeedbackSubmissionSkipped, EraseNewSubmissionFeedbackWrongTutor } from '../../interactors/tutors/eraseNewSubmissionFeedbackInteractor.js';
import { eraseNewSubmissionFeedbackInteractor } from '../../interactors/tutors/index.js';
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

type Response = EraseNewSubmissionFeedbackResponseDTO;

export class EraseNewSubmissionFeedbackController extends BaseController<Request, Response> {

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
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { submissionId } = params;

    const result = await eraseNewSubmissionFeedbackInteractor.execute({ tutorId, studentId, submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case EraseNewSubmissionFeedbackNotFound:
      case EraseNewSubmissionFeedbackSubmissionNotSubmitted:
      case EraseNewSubmissionFeedbackSubmissionSkipped:
        return this.notFound('Submission not found');
      case EraseNewSubmissionFeedbackSubmissionAlreadyClosed:
        return this.forbidden('Submission is already closed');
      case EraseNewSubmissionFeedbackWrongTutor:
        return this.forbidden('No access to this submission');
      case EraseNewSubmissionFeedbackFileUnlinkError:
        return this.internalServerError('Unable to delete file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
