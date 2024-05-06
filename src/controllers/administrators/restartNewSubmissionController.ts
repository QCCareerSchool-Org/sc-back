import * as yup from 'yup';

import { restartNewSubmissionInteractor } from '../../interactors/administrators/index.js';
import type { RestartNewSubmissionResponseDTO } from '../../interactors/administrators/restartNewSubmissionInteractor.js';
import { RestartNewSubmissionAlreadyRestarted, RestartNewSubmissionEnrollmentDueDatePassed, RestartNewSubmissionEnrollmentOnHold, RestartNewSubmissionNotFound, RestartNewSubmissionStudentExpired, RestartNewSubmissionStudentInArrears } from '../../interactors/administrators/restartNewSubmissionInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = RestartNewSubmissionResponseDTO;

export class RestartNewSubmissionController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await restartNewSubmissionInteractor.execute({ submissionId: params.submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case RestartNewSubmissionNotFound:
        return this.notFound('Submission not found');
      case RestartNewSubmissionAlreadyRestarted:
        return this.conflict('Submission already restarted');
      case RestartNewSubmissionStudentExpired:
        return this.conflict('Student expired');
      case RestartNewSubmissionStudentInArrears:
        return this.conflict('Student in arrears');
      case RestartNewSubmissionEnrollmentOnHold:
        return this.conflict('Enrollment on hold');
      case RestartNewSubmissionEnrollmentDueDatePassed:
        return this.conflict('Due date passed');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
