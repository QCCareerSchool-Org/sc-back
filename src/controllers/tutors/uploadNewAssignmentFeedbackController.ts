import * as yup from 'yup';

import { uploadNewUnitFeedbackInteractor } from '../../interactors/tutors';
import type { UploadNewUnitFeedbackResponseDTO } from '../../interactors/tutors/uploadNewUnitFeedbackInteractor';
import { UploadNewUnitFeedbackAlreadyClosed, UploadNewUnitFeedbackCouldNotCreateDirectory, UploadNewUnitFeedbackFileWriteError, UploadNewUnitFeedbackNotFound, UploadNewUnitFeedbackNotSubmitted, UploadNewUnitFeedbackWrongTutor, UploadNewUnitInvalidMimeType, UploadNewUnitUnknownMimeType } from '../../interactors/tutors/uploadNewUnitFeedbackInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** uuid */
    unitId: string;
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

type Response = UploadNewUnitFeedbackResponseDTO;

export class UploadNewUnitFeedbackController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { unitId } = params;

    const result = await uploadNewUnitFeedbackInteractor.execute({
      tutorId,
      studentId,
      unitId,
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
      case UploadNewUnitFeedbackNotFound:
      case UploadNewUnitFeedbackNotSubmitted:
        return this.notFound('Unit not found');
      case UploadNewUnitFeedbackAlreadyClosed:
        return this.forbidden('Unit is already closed');
      case UploadNewUnitFeedbackWrongTutor:
        return this.forbidden('No access to this unit');
      case UploadNewUnitUnknownMimeType:
        return this.badRequest('Unknown file type');
      case UploadNewUnitInvalidMimeType:
        return this.badRequest('Invalid file type');
      case UploadNewUnitFeedbackCouldNotCreateDirectory:
        return this.internalServerError('Could not create directory');
      case UploadNewUnitFeedbackFileWriteError:
        return this.internalServerError('Could not create file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
