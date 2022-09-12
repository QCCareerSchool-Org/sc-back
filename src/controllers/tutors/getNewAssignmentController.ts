import * as yup from 'yup';

import type { GetNewAssignmentResponseDTO } from '../../interactors/tutors/getNewAssignmentInteractor.js';
import { GetNewAssignmentNotFound, GetNewAssignmentSubmissionNotSubmitted, GetNewAssignmentSubmissionSkipped, GetNewAssignmentWrongTutor } from '../../interactors/tutors/getNewAssignmentInteractor.js';
import { getNewAssignmentInteractor } from '../../interactors/tutors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    submissionId: string;
    /** uuid */
    assignmentId: string;
  };
};

type Response = GetNewAssignmentResponseDTO;

export class GetNewAssignmentController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { submissionId, assignmentId } = params;

    const result = await getNewAssignmentInteractor.execute({ tutorId, studentId, submissionId, assignmentId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewAssignmentNotFound:
      case GetNewAssignmentSubmissionNotSubmitted:
      case GetNewAssignmentSubmissionSkipped:
        return this.notFound('Assignment not found');
      case GetNewAssignmentWrongTutor:
        return this.forbidden('No access to this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
