import * as yup from 'yup';

import { saveNewUploadSlotInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewUploadSlotResponseDTO } from '../../interactors/administrators/saveNewUploadSlotInteractor.js';
import { SaveNewUploadSlotMarkOverrideOutOfRange, SaveNewUploadSlotNotFound, SaveNewUploadSlotSubmissionNotClosed, SaveNewUploadSlotSubmissionNotSubmitted, SaveNewUploadSlotSubmissionSkipped } from '../../interactors/administrators/saveNewUploadSlotInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    uploadSlotId: string;
  };
  body: {
    markOverride: number | null;
  };
};

type Response = SaveNewUploadSlotResponseDTO;

export class SaveNewUploadSlotController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      uploadSlotId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await saveNewUploadSlotInteractor.execute({
      uploadSlotId: params.uploadSlotId,
      markOverride: body.markOverride,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewUploadSlotNotFound:
        return this.notFound('Upload slot not found');
      case SaveNewUploadSlotSubmissionNotSubmitted:
        return this.badRequest('Submission not submitted');
      case SaveNewUploadSlotSubmissionSkipped:
        return this.badRequest('Submission skipped');
      case SaveNewUploadSlotSubmissionNotClosed:
        return this.badRequest('Submission not closed');
      case SaveNewUploadSlotMarkOverrideOutOfRange:
        return this.badRequest('Mark override out of range');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
