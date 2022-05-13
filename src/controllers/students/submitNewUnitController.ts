import * as yup from 'yup';

import { submitNewUnitInteractor } from '../../interactors/students';
import type { SubmitNewUnitResponseDTO } from '../../interactors/students/submitNewUnitInteractor';
import { SubmitNewUnitAlreadySubmitted, SubmitNewUnitDefaultPriceNotFound, SubmitNewUnitEnrollmentOnHold, SubmitNewUnitIncomplete, SubmitNewUnitMultipleDefaultPricesFound, SubmitNewUnitNotFound, SubmitNewUnitTutorNotAssigned } from '../../interactors/students/submitNewUnitInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    unitId: string;
  };
};

type Response = SubmitNewUnitResponseDTO;

export class SubmitNewUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId } = params;

    const result = await submitNewUnitInteractor.execute({ studentId, courseId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SubmitNewUnitNotFound:
        return this.notFound('Unit not found');
      case SubmitNewUnitEnrollmentOnHold:
        return this.badRequest('Course is on hold');
      case SubmitNewUnitIncomplete:
        return this.badRequest('Unit is not complete');
      case SubmitNewUnitAlreadySubmitted:
        return this.badRequest('Unit has already been submitted');
      case SubmitNewUnitTutorNotAssigned:
        return this.badRequest('Tutor is not assigned');
      case SubmitNewUnitDefaultPriceNotFound:
        return this.internalServerError('No default price found');
      case SubmitNewUnitMultipleDefaultPricesFound:
        return this.internalServerError('Multiple default prices found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
