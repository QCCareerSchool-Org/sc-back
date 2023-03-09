import * as yup from 'yup';

import type { DownloadNewSubmissionFeedbackResponseDTO } from '../../interactors/students/downloadNewSubmissionFeedbackInteractor.js';
import { DownloadNewSubmissionFeedbackFileNotFound, DownloadNewSubmissionFeedbackFileReadError, DownloadNewSubmissionFeedbackNotClosed, DownloadNewSubmissionFeedbackNotFound, DownloadNewSubmissionFeedbackNotSubmitted, DownloadNewSubmissionFeedbackSkipped } from '../../interactors/students/downloadNewSubmissionFeedbackInteractor.js';
import { downloadNewSubmissionFeedbackInteractor } from '../../interactors/students/index.js';
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

type Response = DownloadNewSubmissionFeedbackResponseDTO;

export class DownloadNewSubmissionFeedbackController extends BaseController<Request, Response> {

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
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { submissionId } = params;

    const result = await downloadNewSubmissionFeedbackInteractor.execute({ studentId, courseId, submissionId });

    if (result.success) {
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewSubmissionFeedbackNotFound:
      case DownloadNewSubmissionFeedbackNotSubmitted:
      case DownloadNewSubmissionFeedbackSkipped:
      case DownloadNewSubmissionFeedbackNotClosed:
        return this.notFound('Submission not found');
      case DownloadNewSubmissionFeedbackFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewSubmissionFeedbackFileReadError:
        return this.internalServerError('Unable to read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
