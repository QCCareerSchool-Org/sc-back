import * as yup from 'yup';

import { eraseNewUnitFeedbackInteractor } from '../../interactors/tutors';
import type { EraseNewUnitFeedbackResponseDTO } from '../../interactors/tutors/eraseNewUnitFeedbackInteractor';
import { EraseNewUnitFeedbackAlreadyClosed, EraseNewUnitFeedbackFileUnlinkError, EraseNewUnitFeedbackNotFound, EraseNewUnitFeedbackNotSubmitted, EraseNewUnitFeedbackWrongTutor } from '../../interactors/tutors/eraseNewUnitFeedbackInteractor';
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

type Response = EraseNewUnitFeedbackResponseDTO;

export class EraseNewUnitFeedbackController extends BaseController<Request, Response> {

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
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { unitId } = params;

    const result = await eraseNewUnitFeedbackInteractor.execute({ tutorId, studentId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case EraseNewUnitFeedbackNotFound:
      case EraseNewUnitFeedbackNotSubmitted:
        return this.notFound('Unit not found');
      case EraseNewUnitFeedbackAlreadyClosed:
        return this.forbidden('Unit is already closed');
      case EraseNewUnitFeedbackWrongTutor:
        return this.forbidden('No access to this unit');
      case EraseNewUnitFeedbackFileUnlinkError:
        return this.internalServerError('Unable to delete file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
