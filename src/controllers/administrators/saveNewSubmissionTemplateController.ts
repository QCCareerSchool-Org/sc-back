import * as yup from 'yup';

import { saveNewSubmissionTemplateInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewSubmissionTemplateResponseDTO } from '../../interactors/administrators/saveNewSubmissionTemplateInteractor.js';
import { SaveNewSubmissionTemplateDescriptionTooLong, SaveNewSubmissionTemplateInvalidUnitLetter, SaveNewSubmissionTemplateMarkingCriteriaTooLong, SaveNewSubmissionTemplateNotFound, SaveNewSubmissionTemplateOrderLessThanZero, SaveNewSubmissionTemplateOrderTooLarge, SaveNewSubmissionTemplateSubmissionsEnabled, SaveNewSubmissionTemplateTitleTooLong, SaveNewSubmissionTemplateUnitLetterAlreadyInUse, SaveNewSubmissionTemplateUnitLetterEmpty, SaveNewSubmissionTemplateUnitLetterTooLong } from '../../interactors/administrators/saveNewSubmissionTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionId: string;
  };
  body: {
    unitLetter: string;
    title: string | null;
    description: string | null;
    markingCriteria: string | null;
    order: number;
    optional: boolean;
  };
};

type Response = SaveNewSubmissionTemplateResponseDTO;

export class SaveNewSubmissionTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      unitLetter: yup.string().defined(),
      title: yup.string().nullable().defined(),
      description: yup.string().nullable().defined(),
      markingCriteria: yup.string().nullable().defined(),
      order: yup.number().defined(),
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

    const result = await saveNewSubmissionTemplateInteractor.execute({
      submissionId: params.submissionId,
      unitLetter: body.unitLetter,
      title: body.title,
      description: body.description,
      markingCriteria: body.markingCriteria,
      optional: body.optional,
      order: body.order,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewSubmissionTemplateNotFound:
        return this.notFound('Part template not found');
      case SaveNewSubmissionTemplateSubmissionsEnabled:
        return this.badRequest('Submissions must be disabled');
      case SaveNewSubmissionTemplateUnitLetterEmpty:
        return this.badRequest('Submission letter cannot be empty');
      case SaveNewSubmissionTemplateUnitLetterTooLong:
        return this.badRequest('Submission letter can have at most one character');
      case SaveNewSubmissionTemplateInvalidUnitLetter:
        return this.badRequest('Invalid submission letter');
      case SaveNewSubmissionTemplateTitleTooLong:
        return this.badRequest('Title length exceeds maximum');
      case SaveNewSubmissionTemplateDescriptionTooLong:
        return this.badRequest('Description length exceeds maximum');
      case SaveNewSubmissionTemplateMarkingCriteriaTooLong:
        return this.badRequest('Marking criteria length exceeds maximum');
      case SaveNewSubmissionTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to zero');
      case SaveNewSubmissionTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      case SaveNewSubmissionTemplateUnitLetterAlreadyInUse:
        return this.badRequest('Submission letter already in use for this course');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
