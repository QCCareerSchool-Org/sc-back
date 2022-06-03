import * as yup from 'yup';

import { insertNewUnitTemplateInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewUnitTemplateResponseDTO } from '../../interactors/administrators/insertNewUnitTemplateInteractor.js';
import { InsertNewUnitTemplateCourseNotFound, InsertNewUnitTemplateDescriptionTooLong, InsertNewUnitTemplateInvalidUnitLetter, InsertNewUnitTemplateMarkingCriteriaTooLong, InsertNewUnitTemplateOrderLessThanZero, InsertNewUnitTemplateOrderTooLarge, InsertNewUnitTemplateTitleTooLong, InsertNewUnitTemplateUnitLetterAlreadyInUse, InsertNewUnitTemplateUnitLetterEmpty, InsertNewUnitTemplateUnitLetterTooLong, InsertNewUnitTemplateUnitsEnabled } from '../../interactors/administrators/insertNewUnitTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    courseId: number;
    unitLetter: string;
    title: string | null;
    description: string | null;
    markingCriteria: string | null;
    optional: boolean;
    order: number;
  };
};

type Response = InsertNewUnitTemplateResponseDTO;

export class InsertNewUnitTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      courseId: yup.number().defined(),
      unitLetter: yup.string().defined(),
      title: yup.string().nullable().defined(),
      description: yup.string().nullable().defined(),
      markingCriteria: yup.string().nullable().defined(),
      optional: yup.boolean().defined(),
      order: yup.number().defined(),
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

    const result = await insertNewUnitTemplateInteractor.execute({
      courseId: body.courseId,
      unitLetter: body.unitLetter,
      title: body.title,
      description: body.description,
      markingCriteria: body.markingCriteria,
      optional: body.optional,
      order: body.order,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewUnitTemplateCourseNotFound:
        return this.notFound('Course not found');
      case InsertNewUnitTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case InsertNewUnitTemplateUnitLetterEmpty:
        return this.badRequest('Unit letter cannot be empty');
      case InsertNewUnitTemplateUnitLetterTooLong:
        return this.badRequest('Unit letter can have at most one character');
      case InsertNewUnitTemplateInvalidUnitLetter:
        return this.badRequest('Invalid unit letter');
      case InsertNewUnitTemplateTitleTooLong:
        return this.badRequest('Title length exceeds maximum');
      case InsertNewUnitTemplateDescriptionTooLong:
        return this.badRequest('Description length exceeds maximum');
      case InsertNewUnitTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking criteria length exceeds maximum');
      case InsertNewUnitTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to zero');
      case InsertNewUnitTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      case InsertNewUnitTemplateUnitLetterAlreadyInUse:
        return this.badRequest('Unit letter is already in use for this course');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
