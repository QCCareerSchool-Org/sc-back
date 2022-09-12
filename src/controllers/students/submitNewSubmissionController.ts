import * as yup from 'yup';

import { submitNewSubmissionInteractor } from '../../interactors/students/index.js';
import type { SubmitNewSubmissionResponseDTO } from '../../interactors/students/submitNewSubmissionInteractor.js';
import { SubmitNewSubmissionAlreadySubmitted, SubmitNewSubmissionDefaultPriceNotFound, SubmitNewSubmissionEnrollmentOnHold, SubmitNewSubmissionIncomplete, SubmitNewSubmissionMultipleDefaultPricesFound, SubmitNewSubmissionNotFound, SubmitNewSubmissionTutorNotAssigned } from '../../interactors/students/submitNewSubmissionInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = SubmitNewSubmissionResponseDTO;

export class SubmitNewSubmissionController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { submissionId } = params;

    const result = await submitNewSubmissionInteractor.execute({ studentId, courseId, submissionId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SubmitNewSubmissionNotFound:
        return this.notFound('Submission not found');
      case SubmitNewSubmissionEnrollmentOnHold:
        return this.badRequest('Course is on hold');
      case SubmitNewSubmissionIncomplete:
        return this.badRequest('Submission is not complete');
      case SubmitNewSubmissionAlreadySubmitted:
        return this.badRequest('Submission has already been submitted');
      case SubmitNewSubmissionTutorNotAssigned:
        return this.badRequest('Tutor is not assigned');
      case SubmitNewSubmissionDefaultPriceNotFound:
        return this.internalServerError('No default price found');
      case SubmitNewSubmissionMultipleDefaultPricesFound:
        return this.internalServerError('Multiple default prices found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
