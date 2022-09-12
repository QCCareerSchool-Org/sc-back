import * as yup from 'yup';

import { DownloadNewSubmissionFeedbackFileNotFound, DownloadNewSubmissionFeedbackFileReadError, DownloadNewSubmissionFeedbackNotFound, DownloadNewSubmissionFeedbackNotSubmitted, DownloadNewSubmissionFeedbackSkipped, DownloadNewSubmissionFeedbackWrongTutor } from '../../interactors/tutors/downloadNewSubmissionFeedbackInteractor.js';
import type { DownloadNewSubmissionFeedbackResponseDTO } from '../../interactors/tutors/downloadNewSubmissionFeedbackInteractor.js';
import { downloadNewSubmissionFeedbackInteractor } from '../../interactors/tutors/index.js';
import type { ByteRange } from '../baseController.js';
import { BaseController } from '../baseController.js';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = DownloadNewSubmissionFeedbackResponseDTO;

export class DownloadNewSubmissionFeedbackController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      const [ headers, params ] = await Promise.all([
        headersSchema.validate(this.req.headers),
        paramsSchema.validate(this.req.params),
      ]);
      return { headers, params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ headers, params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    let byteRange: ByteRange | false | undefined;
    if (headers.range?.startsWith('bytes=')) {
      byteRange = this.getByteRange(headers.range);
    }
    if (byteRange === false) {
      return this.rangeNotSatisfiable();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { submissionId } = params;

    const result = await downloadNewSubmissionFeedbackInteractor.execute({
      tutorId,
      studentId,
      submissionId,
      startByte: byteRange?.start,
      endByte: byteRange?.end,
    });

    if (result.success) {
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewSubmissionFeedbackNotFound:
      case DownloadNewSubmissionFeedbackNotSubmitted:
      case DownloadNewSubmissionFeedbackSkipped:
        return this.notFound('Submission not found');
      case DownloadNewSubmissionFeedbackWrongTutor:
        return this.forbidden('No access to this submission');
      case DownloadNewSubmissionFeedbackFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewSubmissionFeedbackFileReadError:
        return this.internalServerError('Unable to read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
