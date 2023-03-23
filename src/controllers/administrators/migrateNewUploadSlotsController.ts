import * as yup from 'yup';

import { migrateNewUploadSlotsInteractor } from '../../interactors/administrators/index.js';
import type { MigrateNewUploadSlotsResponseDTO } from '../../interactors/administrators/migrateNewUploadSlotsInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
};

type Response = MigrateNewUploadSlotsResponseDTO;

export class MigrateNewUploadSlotsController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await migrateNewUploadSlotsInteractor.execute();

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
