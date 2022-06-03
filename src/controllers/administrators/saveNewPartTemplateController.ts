import * as yup from 'yup';

import { saveNewPartTemplateInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewPartTemplateResponseDTO } from '../../interactors/administrators/saveNewPartTemplateInteractor.js';
import { SaveNewPartTemplateDescriptionTooLong, SaveNewPartTemplateDescriptionTypeEmpty, SaveNewPartTemplateInvalidDescriptionType, SaveNewPartTemplateMarkingCriteriaTooLong, SaveNewPartTemplateNotFound, SaveNewPartTemplatePartNumberAlreadyInUse, SaveNewPartTemplatePartNumberLessThanOne, SaveNewPartTemplatePartNumberTooLarge, SaveNewPartTemplatePartTitleEmpty, SaveNewPartTemplatePartTitleTooLong, SaveNewPartTemplateUnitsEnabled } from '../../interactors/administrators/saveNewPartTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    partId: string;
  };
  body: {
    partNumber: number;
    title: string;
    description: string | null;
    descriptionType: string;
    markingCriteria: string | null;
  };
};

type Response = SaveNewPartTemplateResponseDTO;

export class SaveNewPartTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
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

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await saveNewPartTemplateInteractor.execute({
      partId: params.partId,
      partNumber: body.partNumber,
      title: body.title,
      description: body.description,
      descriptionType: body.descriptionType,
      markingCriteria: body.markingCriteria,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewPartTemplateNotFound:
        return this.notFound('Part template not found');
      case SaveNewPartTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case SaveNewPartTemplatePartTitleEmpty:
        return this.badRequest('Title is empty');
      case SaveNewPartTemplatePartTitleTooLong:
        return this.badRequest('Title exceeds maximum length');
      case SaveNewPartTemplateDescriptionTooLong:
        return this.badRequest('Description exceeds maximum length');
      case SaveNewPartTemplateDescriptionTypeEmpty:
        return this.badRequest('Description type is empty');
      case SaveNewPartTemplateInvalidDescriptionType:
        return this.badRequest('Invalid description type');
      case SaveNewPartTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking criteria exceeds maximum length');
      case SaveNewPartTemplatePartNumberLessThanOne:
        return this.badRequest('Part number must be greater than or equal to one');
      case SaveNewPartTemplatePartNumberTooLarge:
        return this.badRequest('Part number value exceeds maximum');
      case SaveNewPartTemplatePartNumberAlreadyInUse:
        return this.badRequest('Part number already in use for this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
