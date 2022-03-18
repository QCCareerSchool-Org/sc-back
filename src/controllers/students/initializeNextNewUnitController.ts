import * as yup from 'yup';

import { initializeNextNewUnitInteractor } from '../../interactors/students';
import type { InitializeNextNewUnitResponseDTO } from '../../interactors/students/initializeNextNewUnitInteractor';
import { InitializeNextNewUnitCantDetermineUnit, InitializeNextNewUnitEnrollmentNotFound, InitializeNextNewUnitEnrollmentOnHold, InitializeNextNewUnitNoAssignmentsFound, InitializeNextNewUnitNoInputsFound, InitializeNextNewUnitNoMoreUnits, InitializeNextNewUnitNoPartsFound, InitializeNextNewUnitNotReady, InitializeNextNewUnitStudentArrears, InitializeNextNewUnitTemplateNotFound } from '../../interactors/students/initializeNextNewUnitInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
  };
};

type Response = InitializeNextNewUnitResponseDTO;

export class InitializeNextNewUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await initializeNextNewUnitInteractor.execute({ studentId, courseId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InitializeNextNewUnitEnrollmentNotFound:
        return this.notFound('Enrollment not found');
      case InitializeNextNewUnitStudentArrears:
        return this.badRequest('Account is in arrears');
      case InitializeNextNewUnitEnrollmentOnHold:
        return this.badRequest('Course is on hold');
      case InitializeNextNewUnitNotReady:
        return this.badRequest('There are outstanding unmarked units');
      case InitializeNextNewUnitNoMoreUnits:
        return this.badRequest('There are no more units for this course');
      case InitializeNextNewUnitCantDetermineUnit:
        return this.internalServerError('Could not determine next unit');
      case InitializeNextNewUnitTemplateNotFound:
        return this.internalServerError('Could not find next unit');
      case InitializeNextNewUnitNoAssignmentsFound:
        return this.internalServerError('Unit has no assignments');
      case InitializeNextNewUnitNoPartsFound:
        return this.internalServerError('Assignment has no parts');
      case InitializeNextNewUnitNoInputsFound:
        return this.internalServerError('Part has no inputs');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
