import * as yup from 'yup';

import { closeNewUnitInteractor } from '../../interactors/tutors';
import type { CloseNewUnitResponseDTO } from '../../interactors/tutors/closeNewUnitInteractor';
import { CloseNewUnitAlreadyClosed, CloseNewUnitAlreadyReturned, CloseNewUnitNoFeedback, CloseNewUnitNotFound, CloseNewUnitNotMarked, CloseNewUnitNotSubmitted, CloseNewUnitSkipped, CloseNewUnitWrongTutor } from '../../interactors/tutors/closeNewUnitInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    unitId: string;
  };
};

type Response = CloseNewUnitResponseDTO;

export class CloseNewUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      return { params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { unitId } = params;

    const result = await closeNewUnitInteractor.execute({ tutorId, studentId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case CloseNewUnitNotFound:
      case CloseNewUnitNotSubmitted:
      case CloseNewUnitSkipped:
        return this.badRequest('Unit not found');
      case CloseNewUnitAlreadyClosed:
        return this.badRequest('Unit is already closed');
      case CloseNewUnitWrongTutor:
        return this.forbidden('No access to this unit');
      case CloseNewUnitAlreadyReturned:
        return this.badRequest('Unit is already returned');
      case CloseNewUnitNoFeedback:
        return this.badRequest('Feedback is required');
      case CloseNewUnitNotMarked:
        return this.badRequest('Unit is not marked');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
