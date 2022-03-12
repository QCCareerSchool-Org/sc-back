import * as yup from 'yup';

import { insertNewUnitTemplateInteractor } from '../../interactors/administrators';
import type { InsertNewUnitTemplateResponseDTO } from '../../interactors/administrators/insertNewUnitTemplateInteractor';
import { InsertNewUnitTemplateCourseNotFound, InsertNewUnitTemplateInvalidUnitLetter, InsertNewUnitTemplateOrderLessThanZero, InsertNewUnitTemplateOrderTooLarge, InsertNewUnitTemplateUnitLetterAlreadyInUse, InsertNewUnitTemplateUnitLetterEmpty, InsertNewUnitTemplateUnitLetterTooLong, InsertNewUnitTemplateUnitsEnabled } from '../../interactors/administrators/insertNewUnitTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    schoolId: string;
    /** numeric string */
    courseId: string;
  };
  body: {
    unitLetter: string;
    title: string | null;
    description: string | null;
    optional: boolean;
    order: number;
  };
};

type Response = InsertNewUnitTemplateResponseDTO;

export class InsertNewUnitTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      title: yup.string().nullable(true).defined(),
      description: yup.string().nullable(true).defined(),
      unitLetter: yup.string().defined(),
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

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);

    const result = await insertNewUnitTemplateInteractor.execute({ schoolId, courseId, data: body });

    if (result.success) {
      return this.ok(result.value);
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
