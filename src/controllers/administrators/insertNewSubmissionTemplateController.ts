import * as yup from 'yup';

import { insertNewSubmissionTemplateInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewSubmissionTemplateResponseDTO } from '../../interactors/administrators/insertNewSubmissionTemplateInteractor.js';
import { InsertNewSubmissionTemplateCourseNotFound, InsertNewSubmissionTemplateDescriptionTooLong, InsertNewSubmissionTemplateInvalidSubmissionLetter, InsertNewSubmissionTemplateMarkingCriteriaTooLong, InsertNewSubmissionTemplateOrderLessThanZero, InsertNewSubmissionTemplateOrderTooLarge, InsertNewSubmissionTemplateSubmissionLetterAlreadyInUse, InsertNewSubmissionTemplateSubmissionLetterEmpty, InsertNewSubmissionTemplateSubmissionLetterTooLong, InsertNewSubmissionTemplateSubmissionsEnabled, InsertNewSubmissionTemplateTitleTooLong } from '../../interactors/administrators/insertNewSubmissionTemplateInteractor.js';
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

type Response = InsertNewSubmissionTemplateResponseDTO;

export class InsertNewSubmissionTemplateController extends BaseController<Request, Response> {

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

    const result = await insertNewSubmissionTemplateInteractor.execute({
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
      case InsertNewSubmissionTemplateCourseNotFound:
        return this.notFound('Course not found');
      case InsertNewSubmissionTemplateSubmissionsEnabled:
        return this.badRequest('Submissions must be disabled');
      case InsertNewSubmissionTemplateSubmissionLetterEmpty:
        return this.badRequest('Submission letter cannot be empty');
      case InsertNewSubmissionTemplateSubmissionLetterTooLong:
        return this.badRequest('Submission letter can have at most one character');
      case InsertNewSubmissionTemplateInvalidSubmissionLetter:
        return this.badRequest('Invalid submission letter');
      case InsertNewSubmissionTemplateTitleTooLong:
        return this.badRequest('Title length exceeds maximum');
      case InsertNewSubmissionTemplateDescriptionTooLong:
        return this.badRequest('Description length exceeds maximum');
      case InsertNewSubmissionTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking criteria length exceeds maximum');
      case InsertNewSubmissionTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to zero');
      case InsertNewSubmissionTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      case InsertNewSubmissionTemplateSubmissionLetterAlreadyInUse:
        return this.badRequest('Submission letter is already in use for this course');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
