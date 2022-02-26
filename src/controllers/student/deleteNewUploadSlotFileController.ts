import * as yup from 'yup';

import { deleteNewUploadSlotFileInteractor } from '../../interactors';
import { DeleteNewUploadSlotFileEntityNotFound, DeleteNewUploadSlotFileNotFound, DeleteNewUploadSlotFileResponseDTO, DeleteNewUploadSlotFileUnlinkError } from '../../interactors/student/deleteNewUploadSlotFileInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
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

type Response = DeleteNewUploadSlotFileResponseDTO;

export class DeleteNewUploadSlotFileController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    console.log(this.req.file);
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
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
    const { unitId, assignmentId, partId, uploadSlotId } = params;

    const result = await deleteNewUploadSlotFileInteractor.execute({ studentId, unitId, assignmentId, partId, uploadSlotId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case DeleteNewUploadSlotFileNotFound:
        return this.notFound('Upload slot not found');
      case DeleteNewUploadSlotFileUnlinkError:
        return this.internalServerError('Can\'t delete file');
      case DeleteNewUploadSlotFileEntityNotFound:
        return this.internalServerError('Associated entity not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
