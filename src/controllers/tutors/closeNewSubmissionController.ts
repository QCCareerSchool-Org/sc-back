import * as yup from 'yup';

import type { CloseNewSubmissionResponseDTO } from '../../interactors/tutors/closeNewSubmissionInteractor.js';
import { CloseNewSubmissionAlreadyClosed, CloseNewSubmissionAlreadyReturned, CloseNewSubmissionNoFeedback, CloseNewSubmissionNotFound, CloseNewSubmissionNotMarked, CloseNewSubmissionNotSubmitted, CloseNewSubmissionSkipped, CloseNewSubmissionWrongTutor } from '../../interactors/tutors/closeNewSubmissionInteractor.js';
import { closeNewSubmissionInteractor } from '../../interactors/tutors/index.js';
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

type Response = CloseNewSubmissionResponseDTO;

export class CloseNewSubmissionController extends BaseController<Request, Response> {

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

  protected async executeImpl({ params }: Readonly<Request>): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { submissionId } = params;

    const result = await closeNewSubmissionInteractor.execute({ tutorId, studentId, submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case CloseNewSubmissionNotFound:
      case CloseNewSubmissionNotSubmitted:
      case CloseNewSubmissionSkipped:
        return this.badRequest('Submission not found');
      case CloseNewSubmissionAlreadyClosed:
        return this.badRequest('Submission is already closed');
      case CloseNewSubmissionWrongTutor:
        return this.forbidden('No access to this unit');
      case CloseNewSubmissionAlreadyReturned:
        return this.badRequest('Submission is already returned');
      case CloseNewSubmissionNoFeedback:
        return this.badRequest('Feedback is required');
      case CloseNewSubmissionNotMarked:
        return this.badRequest('Submission is not marked');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
