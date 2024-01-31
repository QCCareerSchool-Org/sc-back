import * as yup from 'yup';

import { saveMaterialDataInteractor } from '../../interactors/students/index.js';
import type { SaveMaterialDataResponseDTO } from '../../interactors/students/saveMaterialDataInteractor.js';
import { SaveMaterialDataNotFound } from '../../interactors/students/saveMaterialDataInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** UUID */
    materialId: string;
  };
  body: Record<string, string>;
};

type Response = SaveMaterialDataResponseDTO;

export class SaveMaterialDataController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);

      for (const [ key, value ] of Object.entries(this.req.body as Record<string, unknown>)) {
        if (typeof value !== 'string') {
          throw Error(`Value for key "${key}" is not a string`);
        }
      }

      return { params, body: this.req.body as Record<string, string> };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const studentId = parseInt(params.studentId, 10);

    const result = await saveMaterialDataInteractor.execute({ studentId, materialId: params.materialId, data: body });

    if (result.success) {
      return this.ok();
    }

    switch (result.error.constructor) {
      case SaveMaterialDataNotFound:
        return this.notFound('Material not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
