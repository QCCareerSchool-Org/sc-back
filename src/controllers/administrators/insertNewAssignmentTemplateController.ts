import * as yup from 'yup';

import { insertNewAssignmentTemplateInteractor } from '../../interactors/administrators';
import { InsertNewAssignmentTemplateAssignmentNumberLessThanOne, InsertNewAssignmentTemplateAssignmentNumberTooLarge, InsertNewAssignmentTemplateResponseDTO, InsertNewAssignmentTemplateUnitNotFound } from '../../interactors/administrators/insertNewAssignmentTemplateInteractor';
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
  };
  body: {
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
  };
};

type Response = InsertNewAssignmentTemplateResponseDTO;

export class InsertNewAssignmentTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      title: yup.string().nullable(true).defined(),
      description: yup.string().nullable(true).defined(),
      assignmentNumber: yup.number().defined(),
      optional: yup.boolean().defined(),
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

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId } = params;

    const result = await insertNewAssignmentTemplateInteractor.execute({ schoolId, courseId, unitId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewAssignmentTemplateUnitNotFound:
        return this.notFound('Unit template not found');
      case InsertNewAssignmentTemplateAssignmentNumberLessThanOne:
        return this.badRequest('Assignment number must be greater than or equal to 1');
      case InsertNewAssignmentTemplateAssignmentNumberTooLarge:
        return this.badRequest('Assignment number value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
