import * as yup from 'yup';

import type { DownloadNewAssignmentMediumResponseDTO } from '../../interactors/administrators/downloadNewAssignmentMediumInteractor.js';
import { DownloadNewSubmissionFeedbackFileNotFound, DownloadNewSubmissionFeedbackFileReadError, DownloadNewSubmissionFeedbackSubmissionNotClosed, DownloadNewSubmissionFeedbackSubmissionNotFound, DownloadNewSubmissionFeedbackSubmissionNotSubmitted, DownloadNewSubmissionFeedbackSubmissionSkipped } from '../../interactors/administrators/downloadNewSubmissionFeedbackInteractor.js';
import { downloadNewSubmissionFeedbackInteractor } from '../../interactors/administrators/index.js';
import type { ByteRange } from '../baseController.js';
import { BaseController } from '../baseController.js';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    submissionId: string;
  };
};

type Response = DownloadNewAssignmentMediumResponseDTO;

export class DownloadNewSubmissionFeedbackController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await downloadNewSubmissionFeedbackInteractor.execute({
      submissionId: params.submissionId,
      startByte: byteRange?.start,
      endByte: byteRange?.end,
    });

    if (result.success) {
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewSubmissionFeedbackSubmissionNotFound:
        return this.notFound('Submission not found');
      case DownloadNewSubmissionFeedbackSubmissionNotSubmitted:
        return this.notFound('Submission not submitted');
      case DownloadNewSubmissionFeedbackSubmissionSkipped:
        return this.notFound('Submission skipped');
      case DownloadNewSubmissionFeedbackSubmissionNotClosed:
        return this.notFound('Submission not closed');
      case DownloadNewSubmissionFeedbackFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewSubmissionFeedbackFileReadError:
        return this.internalServerError('File read error');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
