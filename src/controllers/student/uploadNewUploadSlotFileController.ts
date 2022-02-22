import * as yup from 'yup';

import { uploadNewUploadSlotFileInteractor } from '../../interactors';
import { UploadNewUploadSlotFileEntityNotFound, UploadNewUploadSlotFileNotFound, UploadNewUploadSlotFileResponseDTO, UploadNewUploadSlotFileSaveError, UploadNewUploadSlotFileTooLarge } from '../../interactors/student/uploadNewUploadSlotFileInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** hex string */
    unitId: string;
    /** hex string */
    assignmentId: string;
    /** hex string */
    partId: string;
    /** hex string */
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

type Response = UploadNewUploadSlotFileResponseDTO;

export class UploadNewUploadSlotFileController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    console.log(this.req.file);
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const studentId = parseInt(params.studentId, 10);
    const { unitId, assignmentId, partId, uploadSlotId } = params;

    const result = await uploadNewUploadSlotFileInteractor.execute({
      studentId,
      unitId,
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

    switch (result.error.constructor) {
      case UploadNewUploadSlotFileNotFound:
        return this.notFound('Upload slot not found');
      case UploadNewUploadSlotFileTooLarge:
        return this.badRequest('File too large');
      case UploadNewUploadSlotFileSaveError:
        return this.internalServerError('Can\'t save file');
      case UploadNewUploadSlotFileEntityNotFound:
        return this.internalServerError('Associated entity not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
