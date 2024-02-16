import * as yup from 'yup';

import { uploadNewUploadSlotInteractor } from '../../interactors/students/index.js';
import type { UploadNewUploadSlotResponseDTO } from '../../interactors/students/uploadNewUploadSlotInteractor.js';
import { UploadNewUploadSlotCouldNotCreateDirectory, UploadNewUploadSlotEntityNotFound, UploadNewUploadSlotFileTooLarge, UploadNewUploadSlotInvalidFileType, UploadNewUploadSlotNotFound, UploadNewUploadSlotSaveError, UploadNewUploadSlotSubmissionSubmitted } from '../../interactors/students/uploadNewUploadSlotInteractor.js';
import { StudentController } from './index.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    submissionId: string;
    /** uuid */
    assignmentId: string;
    /** uuid */
    partId: string;
    /** uuid */
    uploadSlotId: string;
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

type Response = UploadNewUploadSlotResponseDTO;

export class UploadNewUploadSlotController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      uploadSlotId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { submissionId, assignmentId, partId, uploadSlotId } = params;

    const result = await uploadNewUploadSlotInteractor.execute({
      studentId,
      courseId,
      submissionId,
      assignmentId,
      partId,
      uploadSlotId,
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

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case UploadNewUploadSlotNotFound:
        return this.notFound('Upload slot not found');
      case UploadNewUploadSlotSubmissionSubmitted:
        return this.badRequest('Submission already submitted');
      case UploadNewUploadSlotFileTooLarge:
        return this.badRequest('File too large');
      case UploadNewUploadSlotInvalidFileType:
        return this.badRequest('Invalid file type');
      case UploadNewUploadSlotEntityNotFound:
        return this.internalServerError('Associated entity not found');
      case UploadNewUploadSlotCouldNotCreateDirectory:
      case UploadNewUploadSlotSaveError:
        return this.internalServerError('Can\'t save file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
