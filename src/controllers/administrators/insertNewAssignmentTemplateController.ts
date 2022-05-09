import * as yup from 'yup';

import { insertNewAssignmentTemplateInteractor } from '../../interactors/administrators';
import type { InsertNewAssignmentTemplateResponseDTO } from '../../interactors/administrators/insertNewAssignmentTemplateInteractor';
import { InsertNewAssignmentTemplateAssignmentNumberAlreadyInUse, InsertNewAssignmentTemplateAssignmentNumberLessThanOne, InsertNewAssignmentTemplateAssignmentNumberTooLarge, InsertNewAssignmentTemplateDescriptionTooLong, InsertNewAssignmentTemplateMarkingCriteriaTooLong, InsertNewAssignmentTemplateTitleTooLong, InsertNewAssignmentTemplateUnitNotFound, InsertNewAssignmentTemplateUnitsEnabled } from '../../interactors/administrators/insertNewAssignmentTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    unitId: string;
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    markingCriteria: string | null;
    optional: boolean;
  };
};

type Response = InsertNewAssignmentTemplateResponseDTO;

export class InsertNewAssignmentTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentNumber: yup.number().defined(),
      title: yup.string().nullable(true).defined(),
      description: yup.string().nullable(true).defined(),
      markingCriteria: yup.string().nullable().defined(),
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

  protected async executeImpl({ body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertNewAssignmentTemplateInteractor.execute({
      unitId: body.unitId,
      assignmentNumber: body.assignmentNumber,
      title: body.title,
      description: body.description,
      markingCriteria: body.markingCriteria,
      optional: body.optional,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewAssignmentTemplateUnitNotFound:
        return this.notFound('Unit template not found');
      case InsertNewAssignmentTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case InsertNewAssignmentTemplateAssignmentNumberLessThanOne:
        return this.badRequest('Assignment number must be greater than or equal to 1');
      case InsertNewAssignmentTemplateAssignmentNumberTooLarge:
        return this.badRequest('Assignment number value exceeds maximum');
      case InsertNewAssignmentTemplateTitleTooLong:
        return this.badRequest('Title length exceeds maximum');
      case InsertNewAssignmentTemplateDescriptionTooLong:
        return this.badRequest('Description length exceeds maximum');
      case InsertNewAssignmentTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking criteria length exceeds maximum');
      case InsertNewAssignmentTemplateAssignmentNumberAlreadyInUse:
        return this.badRequest('Assignment number already in use for this unit');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
