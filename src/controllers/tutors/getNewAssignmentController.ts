import * as yup from 'yup';

import { getNewAssignmentInteractor } from '../../interactors/tutors';
import type { GetNewAssignmentResponseDTO } from '../../interactors/tutors/getNewAssignmentInteractor';
import { GetNewAssignmentNotFound, GetNewAssignmentUnitNotSubmitted, GetNewAssignmentWrongTutor } from '../../interactors/tutors/getNewAssignmentInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    unitId: string;
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
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { unitId, assignmentId } = params;

    const result = await getNewAssignmentInteractor.execute({ tutorId, studentId, unitId, assignmentId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewAssignmentNotFound:
      case GetNewAssignmentUnitNotSubmitted:
        return this.notFound('Assignment not found');
      case GetNewAssignmentWrongTutor:
        return this.forbidden('No access to this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
