import * as yup from 'yup';

import { eraseNewUploadSlotInteractor } from '../../interactors/students';
import type { EraseNewUploadSlotResponseDTO } from '../../interactors/students/eraseNewUploadSlotInteractor';
import { EraseNewUploadSlotNotFound, EraseNewUploadSlotUnitSubmitted, EraseNewUploadSlotUnlinkError } from '../../interactors/students/eraseNewUploadSlotInteractor';
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

type Response = EraseNewUploadSlotResponseDTO;

export class EraseNewUploadSlotController extends BaseController<Request, Response> {

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
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, partId, uploadSlotId } = params;

    const result = await eraseNewUploadSlotInteractor.execute({ studentId, courseId, unitId, assignmentId, partId, uploadSlotId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case EraseNewUploadSlotNotFound:
        return this.notFound('Upload slot not found');
      case EraseNewUploadSlotUnitSubmitted:
        return this.badRequest('Unit already submitted');
      case EraseNewUploadSlotUnlinkError:
        return this.internalServerError('Can\'t delete file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
