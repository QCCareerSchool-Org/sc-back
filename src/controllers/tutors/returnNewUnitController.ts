import * as yup from 'yup';

import { returnNewUnitInteractor } from '../../interactors/tutors';
import type { ReturnNewUnitResponseDTO } from '../../interactors/tutors/returnNewUnitInteractor';
import { ReturnNewUnitAlreadyClosed, ReturnNewUnitAlreadyReturned, ReturnNewUnitCommentEmpty, ReturnNewUnitNotFound, ReturnNewUnitNotSubmitted, ReturnNewUnitSkipped, ReturnNewUnitWrongTutor } from '../../interactors/tutors/returnNewUnitInteractor';
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
  body: {
    comment: string;
  };
};

type Response = ReturnNewUnitResponseDTO;

export class ReturnNewUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      comment: yup.string().defined(),
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

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { unitId } = params;
    const { comment } = body;

    const result = await returnNewUnitInteractor.execute({ tutorId, studentId, unitId, comment });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case ReturnNewUnitNotFound:
      case ReturnNewUnitNotSubmitted:
      case ReturnNewUnitSkipped:
        return this.badRequest('Unit not found');
      case ReturnNewUnitAlreadyClosed:
        return this.badRequest('Unit is already closed');
      case ReturnNewUnitWrongTutor:
        return this.forbidden('No access to this unit');
      case ReturnNewUnitAlreadyReturned:
        return this.badRequest('Unit is already returned');
      case ReturnNewUnitCommentEmpty:
        return this.badRequest('Comment cannot be empty');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
