import * as yup from 'yup';

import { returnNewSubmissionInteractor } from '../../interactors/tutors/index.js';
import type { ReturnNewSubmissionResponseDTO } from '../../interactors/tutors/returnNewSubmissionInteractor.js';
import { ReturnNewSubmissionAlreadyClosed, ReturnNewSubmissionAlreadyReturned, ReturnNewSubmissionCommentEmpty, ReturnNewSubmissionNotFound, ReturnNewSubmissionNotSubmitted, ReturnNewSubmissionSkipped, ReturnNewSubmissionWrongTutor } from '../../interactors/tutors/returnNewSubmissionInteractor.js';
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
  body: {
    comment: string;
  };
};

type Response = ReturnNewSubmissionResponseDTO;

export class ReturnNewSubmissionController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      comment: yup.string().defined(),
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

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { submissionId } = params;
    const { comment } = body;

    const result = await returnNewSubmissionInteractor.execute({ tutorId, studentId, submissionId, comment });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case ReturnNewSubmissionNotFound:
      case ReturnNewSubmissionNotSubmitted:
      case ReturnNewSubmissionSkipped:
        return this.badRequest('Submission not found');
      case ReturnNewSubmissionAlreadyClosed:
        return this.badRequest('Submission is already closed');
      case ReturnNewSubmissionWrongTutor:
        return this.forbidden('No access to this submission');
      case ReturnNewSubmissionAlreadyReturned:
        return this.badRequest('Submission is already returned');
      case ReturnNewSubmissionCommentEmpty:
        return this.badRequest('Comment cannot be empty');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
