import * as yup from 'yup';

import { saveNewAssignmentTemplateInteractor } from '../../interactors/administrators';
import type { SaveNewAssignmentTemplateResponseDTO } from '../../interactors/administrators/saveNewAssignmentTemplateInteractor';
import { SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse, SaveNewAssignmentTemplateAssignmentNumberLessThanOne, SaveNewAssignmentTemplateAssignmentNumberTooLarge, SaveNewAssignmentTemplateDescriptionTooLong, SaveNewAssignmentTemplateMarkingCriteriaTooLong, SaveNewAssignmentTemplateNotFound, SaveNewAssignmentTemplateTitleTooLong, SaveNewAssignmentTemplateUnitsEnabled } from '../../interactors/administrators/saveNewAssignmentTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    assignmentId: string;
  };
  body: {
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    markingCriteria: string | null;
    optional: boolean;
  };
};

type Response = SaveNewAssignmentTemplateResponseDTO;

export class SaveNewAssignmentTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      assignmentNumber: yup.number().defined(),
      title: yup.string().nullable().defined(),
      description: yup.string().nullable().defined(),
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

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await saveNewAssignmentTemplateInteractor.execute({
      assignmentId: params.assignmentId,
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
      case SaveNewAssignmentTemplateNotFound:
        return this.notFound('Part template not found');
      case SaveNewAssignmentTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case SaveNewAssignmentTemplateAssignmentNumberLessThanOne:
        return this.badRequest('Assignment number must be greater than or equal to one');
      case SaveNewAssignmentTemplateAssignmentNumberTooLarge:
        return this.badRequest('Assignment number value exceeds maximum');
      case SaveNewAssignmentTemplateTitleTooLong:
        return this.badRequest('Title length exceeds maximum');
      case SaveNewAssignmentTemplateDescriptionTooLong:
        return this.badRequest('Description length exceeds maximum');
      case SaveNewAssignmentTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking criteria length exceeds maximum');
      case SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse:
        return this.badRequest('Assignment number already in use for this unit');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
