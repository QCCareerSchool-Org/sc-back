import * as yup from 'yup';

import { saveNewTextBoxInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewTextBoxResponseDTO } from '../../interactors/administrators/saveNewTextBoxInteractor.js';
import { SaveNewTextBoxMarkOverrideOutOfRange, SaveNewTextBoxNotFound, SaveNewTextBoxSubmissionNotClosed, SaveNewTextBoxSubmissionNotSubmitted, SaveNewTextBoxSubmissionSkipped } from '../../interactors/administrators/saveNewTextBoxInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    textBoxId: string;
  };
  body: {
    markOverride: number | null;
  };
};

type Response = SaveNewTextBoxResponseDTO;

export class SaveNewTextBoxController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      textBoxId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      markOverride: yup.number().nullable(true).defined(),
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

    const result = await saveNewTextBoxInteractor.execute({
      textBoxId: params.textBoxId,
      markOverride: body.markOverride,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewTextBoxNotFound:
        return this.notFound('Text box template not found');
      case SaveNewTextBoxSubmissionNotSubmitted:
        return this.badRequest('Submission not submitted');
      case SaveNewTextBoxSubmissionSkipped:
        return this.badRequest('Submission skipped');
      case SaveNewTextBoxSubmissionNotClosed:
        return this.badRequest('Submission not closed');
      case SaveNewTextBoxMarkOverrideOutOfRange:
        return this.badRequest('Mark override out of range');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
