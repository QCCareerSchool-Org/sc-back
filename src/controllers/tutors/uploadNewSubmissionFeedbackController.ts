import * as yup from 'yup';

import { uploadNewSubmissionFeedbackInteractor } from '../../interactors/tutors/index.js';
import type { UploadNewSubmissionFeedbackResponseDTO } from '../../interactors/tutors/uploadNewSubmissionFeedbackInteractor.js';
import { UploadNewSubmissionFeedbackCouldNotCreateDirectory, UploadNewSubmissionFeedbackFileWriteError, UploadNewSubmissionFeedbackMimeTypeDoesntMatch, UploadNewSubmissionFeedbackNotFound, UploadNewSubmissionFeedbackSubmissionAlreadyClosed, UploadNewSubmissionFeedbackSubmissionNotSubmitted, UploadNewSubmissionFeedbackSubmissionSkipped, UploadNewSubmissionFeedbackWrongTutor, UploadNewSubmissionInvalidMimeType, UploadNewSubmissionUnknownMimeType } from '../../interactors/tutors/uploadNewSubmissionFeedbackInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    submissionId: string;
  };
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  };
};

type Response = UploadNewSubmissionFeedbackResponseDTO;

export class UploadNewSubmissionFeedbackController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const fileSchema: yup.SchemaOf<Omit<Request['file'], 'buffer'>> = yup.object({
      fieldname: yup.string().defined(),
      originalname: yup.string().defined(),
      encoding: yup.string().defined(),
      mimetype: yup.string().defined(),
      // buffer: yup.object<any>().defined(),
      size: yup.number().defined(),
    });
    try {
      const [ params, file ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        fileSchema.validate(this.req.file),
      ]);
      return { params, file: file as Request['file'] };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, file }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { submissionId } = params;

    const result = await uploadNewSubmissionFeedbackInteractor.execute({
      tutorId,
      studentId,
      submissionId,
      file: {
        filename: file.originalname,
        mimeType: file.mimetype,
        data: file.buffer,
        size: file.size,
      },
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case UploadNewSubmissionFeedbackNotFound:
      case UploadNewSubmissionFeedbackSubmissionNotSubmitted:
      case UploadNewSubmissionFeedbackSubmissionSkipped:
        return this.notFound('Submission not found');
      case UploadNewSubmissionFeedbackSubmissionAlreadyClosed:
        return this.forbidden('Submission is already closed');
      case UploadNewSubmissionFeedbackWrongTutor:
        return this.forbidden('No access to this submission');
      case UploadNewSubmissionFeedbackMimeTypeDoesntMatch:
        return this.badRequest('Detected mime type doesn\'t match submitted mime type. Did you change the file extension?');
      case UploadNewSubmissionUnknownMimeType:
        return this.badRequest('Unknown file type');
      case UploadNewSubmissionInvalidMimeType:
        return this.badRequest('Invalid file type');
      case UploadNewSubmissionFeedbackCouldNotCreateDirectory:
        return this.internalServerError('Could not create directory');
      case UploadNewSubmissionFeedbackFileWriteError:
        return this.internalServerError('Could not create file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
