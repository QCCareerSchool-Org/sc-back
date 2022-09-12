import * as yup from 'yup';

import { saveNewTextBoxInteractor } from '../../interactors/tutors/index.js';
import type { SaveNewTextBoxResponseDTO } from '../../interactors/tutors/saveNewTextBoxInteractor.js';
import { SaveNewTextBoxAlreadyReturned, SaveNewTextBoxIncomplete, SaveNewTextBoxMarkLessThanZero, SaveNewTextBoxMarkTooHigh, SaveNewTextBoxNotesTooLong, SaveNewTextBoxNotFound, SaveNewTextBoxSubmissionAlreadyClosed, SaveNewTextBoxSubmissionNotSubmitted, SaveNewTextBoxSubmissionSkipped, SaveNewTextBoxWrongTutor, SaveNewTextBoxZeroPoints } from '../../interactors/tutors/saveNewTextBoxInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** uuid */
    textBoxId: string;
  };
  body: {
    mark: number | null;
    notes: string | null;
  };
};

type Response = SaveNewTextBoxResponseDTO;

export class SaveNewTextBoxController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      textBoxId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      mark: yup.number().nullable().defined(),
      notes: yup.string().nullable().defined(),
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
    if (!this.isPatchMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const { textBoxId } = params;
    const { mark, notes } = body;

    const result = await saveNewTextBoxInteractor.execute({ tutorId, textBoxId, mark, notes });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewTextBoxNotFound:
      case SaveNewTextBoxSubmissionNotSubmitted:
      case SaveNewTextBoxSubmissionSkipped:
        return this.notFound('Text box not found');
      case SaveNewTextBoxSubmissionAlreadyClosed:
        return this.badRequest('Submission is already closed');
      case SaveNewTextBoxWrongTutor:
        return this.forbidden('No access to this submission');
      case SaveNewTextBoxAlreadyReturned:
        return this.badRequest('Submission is already retured');
      case SaveNewTextBoxIncomplete:
        return this.badRequest('Text box is not complete');
      case SaveNewTextBoxZeroPoints:
        return this.badRequest('Text box is not markable (zero points)');
      case SaveNewTextBoxMarkLessThanZero:
        return this.badRequest('Mark must be greater than or equal to zero');
      case SaveNewTextBoxMarkTooHigh:
        return this.badRequest(`Mark must be less than or equal to ${(result.error as SaveNewTextBoxMarkTooHigh).maxMark}`);
      case SaveNewTextBoxNotesTooLong:
        return this.badRequest('Notes value exceeds maximum length');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
