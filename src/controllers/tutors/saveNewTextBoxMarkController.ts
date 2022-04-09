import * as yup from 'yup';

import { saveNewTextBoxMarkInteractor } from '../../interactors/tutors';
import type { SaveNewTextBoxMarkResponseDTO } from '../../interactors/tutors/saveNewTextBoxMarkInteractor';
import { SaveNewTextBoxMarkAlreadyReturned, SaveNewTextBoxMarkIncomplete, SaveNewTextBoxMarkLessThanZero, SaveNewTextBoxMarkNotFound, SaveNewTextBoxMarkTooHigh, SaveNewTextBoxMarkUnitAlreadyClosed, SaveNewTextBoxMarkUnitNotSubmitted, SaveNewTextBoxMarkUnitSkipped, SaveNewTextBoxMarkWrongTutor, SaveNewTextBoxMarkZeroPoints } from '../../interactors/tutors/saveNewTextBoxMarkInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** uuid */
    textBoxId: string;
  };
  body: {
    mark: number | null;
  };
};

type Response = SaveNewTextBoxMarkResponseDTO;

export class SaveNewTextBoxMarkController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      textBoxId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      mark: yup.number().nullable().defined(),
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

    const tutorId = parseInt(params.tutorId, 10);
    const { textBoxId } = params;
    const { mark } = body;

    const result = await saveNewTextBoxMarkInteractor.execute({ tutorId, textBoxId, mark });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewTextBoxMarkNotFound:
      case SaveNewTextBoxMarkUnitNotSubmitted:
      case SaveNewTextBoxMarkUnitSkipped:
        return this.notFound('Text box not found');
      case SaveNewTextBoxMarkUnitAlreadyClosed:
        return this.badRequest('Unit is already closed');
      case SaveNewTextBoxMarkWrongTutor:
        return this.forbidden('No access to this unit');
      case SaveNewTextBoxMarkAlreadyReturned:
        return this.badRequest('Unit is already retured');
      case SaveNewTextBoxMarkIncomplete:
        return this.badRequest('Text box is not complete');
      case SaveNewTextBoxMarkZeroPoints:
        return this.badRequest('Text box is not markable (zero points)');
      case SaveNewTextBoxMarkLessThanZero:
        return this.badRequest('Mark must be greater than or equal to zero');
      case SaveNewTextBoxMarkTooHigh:
        return this.badRequest('Mark must be less than or equal to points');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
