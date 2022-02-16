import * as yup from 'yup';

import { getNewAssignmentInteractor } from '../../interactors';
import { GetNewAssignmentNotFound, GetNewAssignmentResponseDTO } from '../../interactors/students/getNewAssignmentInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    enrollmentId: string;
    /** hex string */
    unitId: string;
    /** hex string */
    assignmentId: string;
  };
};

type Response = GetNewAssignmentResponseDTO;

export class GetNewAssignmentController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      enrollmentId: yup.string().matches(/^\d+$/u).defined(),
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
    const studentId = parseInt(params.studentId, 10);
    const enrollmentId = parseInt(params.enrollmentId, 10);
    const { unitId, assignmentId } = params;

    const result = await getNewAssignmentInteractor.execute({ studentId, enrollmentId, unitId, assignmentId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewAssignmentNotFound:
        return this.notFound('Assignment not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
