import * as yup from 'yup';

import { insertNewPartTemplateInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewPartTemplateResponseDTO } from '../../interactors/administrators/insertNewPartTemplateInteractor.js';
import { InsertNewPartTemplateAssignmentNotFound, InsertNewPartTemplateDescriptionTooLong, InsertNewPartTemplateDescriptionTypeEmpty, InsertNewPartTemplateInvalidDescriptionType, InsertNewPartTemplateMarkingCriteriaTooLong, InsertNewPartTemplatePartNumberAlreadyInUse, InsertNewPartTemplatePartNumberLessThanOne, InsertNewPartTemplatePartNumberTooLarge, InsertNewPartTemplatePartTitleEmpty, InsertNewPartTemplatePartTitleTooLong, InsertNewPartTemplateUnitsEnabled } from '../../interactors/administrators/insertNewPartTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    assignmentId: string;
    partNumber: number;
    title: string;
    description: string | null;
    descriptionType: string;
    markingCriteria: string | null;
  };
};

type Response = InsertNewPartTemplateResponseDTO;

export class InsertNewPartTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partNumber: yup.number().defined(),
      title: yup.string().defined(),
      description: yup.string().nullable().defined(),
      descriptionType: yup.string().defined(),
      markingCriteria: yup.string().nullable().defined(),
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

    const result = await insertNewPartTemplateInteractor.execute({
      assignmentId: body.assignmentId,
      partNumber: body.partNumber,
      title: body.title,
      description: body.description,
      descriptionType: body.descriptionType,
      markingCriteria: body.markingCriteria,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewPartTemplateAssignmentNotFound:
        return this.notFound('Assignment template not found');
      case InsertNewPartTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case InsertNewPartTemplatePartTitleEmpty:
        return this.badRequest('Title is empty');
      case InsertNewPartTemplatePartTitleTooLong:
        return this.badRequest('Title exceeds maximum length');
      case InsertNewPartTemplateDescriptionTooLong:
        return this.badRequest('Description exceeds maximum length');
      case InsertNewPartTemplateDescriptionTypeEmpty:
        return this.badRequest('Description type is empty');
      case InsertNewPartTemplateInvalidDescriptionType:
        return this.badRequest('Invalid description type');
      case InsertNewPartTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking critera exceeds maximum length');
      case InsertNewPartTemplatePartNumberLessThanOne:
        return this.badRequest('Part number must be greater than or equal to 1');
      case InsertNewPartTemplatePartNumberTooLarge:
        return this.badRequest('Part number value exceeds maximum');
      case InsertNewPartTemplatePartNumberAlreadyInUse:
        return this.badRequest('Part number already in use for this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
