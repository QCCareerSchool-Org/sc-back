import * as yup from 'yup';

import { getNewUnitInteractor } from '../../interactors/tutors';
import type { GetNewUnitResponseDTO } from '../../interactors/tutors/getNewUnitInteractor';
import { GetNewUnitNotFound, GetNewUnitNotSubmitted, GetNewUnitSkipped, GetNewUnitWrongTutor } from '../../interactors/tutors/getNewUnitInteractor';
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

type Response = GetNewUnitResponseDTO;

export class GetNewUnitController extends BaseController<Request, Response> {

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
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { unitId } = params;

    const result = await getNewUnitInteractor.execute({ tutorId, studentId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewUnitNotFound:
      case GetNewUnitNotSubmitted:
      case GetNewUnitSkipped:
        return this.notFound('Unit not found');
      case GetNewUnitWrongTutor:
        return this.forbidden('No access to this unit');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
