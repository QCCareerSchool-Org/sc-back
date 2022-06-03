import * as yup from 'yup';

import { skipNewUnitInteractor } from '../../interactors/students/index.js';
import type { SkipNewUnitResponseDTO } from '../../interactors/students/skipNewUnitInteractor.js';
import { SkipNewUnitAlreadySubmitted, SkipNewUnitEnrollmentOnHold, SkipNewUnitNotFound } from '../../interactors/students/skipNewUnitInteractor.js';
import { BaseController } from '../baseController.js';

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

type Response = SkipNewUnitResponseDTO;

export class SkipNewUnitController extends BaseController<Request, Response> {

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

    const result = await skipNewUnitInteractor.execute({ studentId, courseId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SkipNewUnitNotFound:
        return this.notFound('Unit not found');
      case SkipNewUnitEnrollmentOnHold:
        return this.badRequest('Course is on hold');
      case SkipNewUnitAlreadySubmitted:
        return this.badRequest('Unit has already been submitted');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
