import * as yup from 'yup';

import { saveNewUploadSlotInteractor } from '../../interactors/tutors/index.js';
import type { SaveNewUploadSlotResponseDTO } from '../../interactors/tutors/saveNewUploadSlotInteractor.js';
import { SaveNewUploadSlotAlreadyReturned, SaveNewUploadSlotIncomplete, SaveNewUploadSlotMarkLessThanZero, SaveNewUploadSlotMarkTooHigh, SaveNewUploadSlotNotesTooLong, SaveNewUploadSlotNotFound, SaveNewUploadSlotUnitAlreadyClosed, SaveNewUploadSlotUnitNotSubmitted, SaveNewUploadSlotUnitSkipped, SaveNewUploadSlotWrongTutor, SaveNewUploadSlotZeroPoints } from '../../interactors/tutors/saveNewUploadSlotInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** uuid */
    uploadSlotId: string;
  };
  body: {
    mark: number | null;
    notes: string | null;
  };
};

type Response = SaveNewUploadSlotResponseDTO;

export class SaveNewUploadSlotController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      uploadSlotId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { uploadSlotId } = params;
    const { mark, notes } = body;

    const result = await saveNewUploadSlotInteractor.execute({ tutorId, uploadSlotId, mark, notes });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewUploadSlotNotFound:
      case SaveNewUploadSlotUnitNotSubmitted:
      case SaveNewUploadSlotUnitSkipped:
        return this.notFound('Text box not found');
      case SaveNewUploadSlotUnitAlreadyClosed:
        return this.badRequest('Unit is already closed');
      case SaveNewUploadSlotWrongTutor:
        return this.forbidden('No access to this unit');
      case SaveNewUploadSlotAlreadyReturned:
        return this.badRequest('Unit is already retured');
      case SaveNewUploadSlotIncomplete:
        return this.badRequest('Text box is not complete');
      case SaveNewUploadSlotZeroPoints:
        return this.badRequest('Text box is not markable (zero points)');
      case SaveNewUploadSlotMarkLessThanZero:
        return this.badRequest('Mark must be greater than or equal to zero');
      case SaveNewUploadSlotMarkTooHigh:
        return this.badRequest(`Mark must be less than or equal to ${(result.error as SaveNewUploadSlotMarkTooHigh).maxMark}`);
      case SaveNewUploadSlotNotesTooLong:
        return this.badRequest('Notes value exceeds maximum length');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
