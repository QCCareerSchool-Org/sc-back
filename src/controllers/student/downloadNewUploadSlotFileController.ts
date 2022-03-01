import * as yup from 'yup';

import { downloadNewUploadSlotFileInteractor } from '../../interactors';
import { DownloadNewUploadSlotFileNotFound, DownloadNewUploadSlotFileReadError } from '../../interactors/student/downloadNewUploadSlotFileInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    unitId: string;
    /** uuid */
    assignmentId: string;
    /** uuid */
    partId: string;
    /** uuid */
    uploadSlotId: string;
  };
};

type Response = void;

export class DownloadNewUploadSlotFileController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      uploadSlotId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { unitId, assignmentId, partId, uploadSlotId } = params;

    const result = await downloadNewUploadSlotFileInteractor.execute({
      studentId,
      courseId,
      unitId,
      assignmentId,
      partId,
      uploadSlotId,
    });

    if (result.success) {
      const { data, filename, mimeType, size } = result.value;
      return this.sendFile(data, filename, mimeType, size);
    }

    switch (result.error.constructor) {
      case DownloadNewUploadSlotFileNotFound:
        return this.notFound('Upload slot not found');
      case DownloadNewUploadSlotFileReadError:
        return this.internalServerError('Can\'t read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
