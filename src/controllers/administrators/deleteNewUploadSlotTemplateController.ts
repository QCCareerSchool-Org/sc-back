import * as yup from 'yup';

import { deleteNewUploadSlotTemplateInteractor } from '../../interactors/administrators';
import type { DeleteNewUploadSlotTemplateResponseDTO } from '../../interactors/administrators/deleteNewUploadSlotTemplateInteractor';
import { DeleteNewUploadSlotTemplateNotFound, DeleteNewUploadSlotTemplateUnitsEnabled } from '../../interactors/administrators/deleteNewUploadSlotTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    uploadSlotId: string;
  };
};

type Response = DeleteNewUploadSlotTemplateResponseDTO;

export class DeleteNewUploadSlotTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await deleteNewUploadSlotTemplateInteractor.execute({ uploadSlotId: params.uploadSlotId });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteNewUploadSlotTemplateNotFound:
        return this.notFound('Upload slot template not found');
      case DeleteNewUploadSlotTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
