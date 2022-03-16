import * as yup from 'yup';

import { deleteNewAssignmentTemplateInteractor } from '../../interactors/administrators';
import type { DeleteNewAssignmentTemplateResponseDTO } from '../../interactors/administrators/deleteNewAssignmentTemplateInteractor';
import { DeleteNewAssignmentTemplateNotFound, DeleteNewAssignmentTemplateUnitsEnabled } from '../../interactors/administrators/deleteNewAssignmentTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    schoolId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    unitId: string;
    /** uuid */
    assignmentId: string;
  };
};

type Response = DeleteNewAssignmentTemplateResponseDTO;

export class DeleteNewAssignmentTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId } = params;

    const result = await deleteNewAssignmentTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewAssignmentTemplateNotFound:
        return this.notFound('Assignment template not found');
      case DeleteNewAssignmentTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
