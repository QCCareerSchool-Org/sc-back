import * as yup from 'yup';

import { initializeNextNewSubmissionInteractor } from '../../interactors/students/index.js';
import type { InitializeNextNewSubmissionResponseDTO } from '../../interactors/students/initializeNextNewSubmissionInteractor.js';
import { InitializeNextCourseDisabled, InitializeNextNewSubmissionAssignmentsDisabled, InitializeNextNewSubmissionCantDetermineSubmission, InitializeNextNewSubmissionDefaultPriceNotFound, InitializeNextNewSubmissionEnrollmentNotFound, InitializeNextNewSubmissionMultipleDefaultPricesFound, InitializeNextNewSubmissionNoAssignmentsFound, InitializeNextNewSubmissionNoInputsFound, InitializeNextNewSubmissionNoMoreSubmissions, InitializeNextNewSubmissionNoPartsFound, InitializeNextNewSubmissionNotReady, InitializeNextNewSubmissionTemplateNotFound } from '../../interactors/students/initializeNextNewSubmissionInteractor.js';
import { StudentController } from './index.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
  };
};

type Response = InitializeNextNewSubmissionResponseDTO;

export class InitializeNextNewSubmissionController extends StudentController<Request, Response> {

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

    const result = await initializeNextNewSubmissionInteractor.execute({ studentId, courseId });

    if (result.success) {
      return this.ok(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case InitializeNextNewSubmissionEnrollmentNotFound:
        return this.notFound('Enrollment not found');
      case InitializeNextNewSubmissionAssignmentsDisabled:
        return this.badRequest('Assignments are disabled for this course');
      case InitializeNextCourseDisabled:
        return this.badRequest('This course is currently undergoing maintenance');
      case InitializeNextNewSubmissionNotReady:
        return this.badRequest('There are outstanding unmarked submissions');
      case InitializeNextNewSubmissionNoMoreSubmissions:
        return this.badRequest('There are no more submissions for this course');
      case InitializeNextNewSubmissionCantDetermineSubmission:
        return this.internalServerError('Could not determine next submission');
      case InitializeNextNewSubmissionTemplateNotFound:
        return this.internalServerError('Could not find next submission');
      case InitializeNextNewSubmissionDefaultPriceNotFound:
        return this.internalServerError('No default price found');
      case InitializeNextNewSubmissionMultipleDefaultPricesFound:
        return this.internalServerError('Multiple default prices found');
      case InitializeNextNewSubmissionNoAssignmentsFound:
        return this.internalServerError('Submission has no assignments');
      case InitializeNextNewSubmissionNoPartsFound:
        return this.internalServerError('Assignment has no parts');
      case InitializeNextNewSubmissionNoInputsFound:
        return this.internalServerError('Part has no inputs');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
