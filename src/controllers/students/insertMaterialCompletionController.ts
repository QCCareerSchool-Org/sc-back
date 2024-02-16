import * as yup from 'yup';

import { insertMaterialCompletionInteractor } from '../../interactors/students/index.js';
import type { InsertMaterialCompletionResponseDTO } from '../../interactors/students/insertMaterialCompletionInteractor.js';
import { InsertMaterialCompletionAlreadyExists, InsertMaterialCompletionMaterialNotFound } from '../../interactors/students/insertMaterialCompletionInteractor.js';
import { StudentController } from './index.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    enrollmentId: string;
    /** uuid */
    materialId: string;
  };
};

type Response = InsertMaterialCompletionResponseDTO;

export class InsertMaterialCompletionController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      enrollmentId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const enrollmentId = parseInt(params.enrollmentId, 10);
    const { materialId } = params;

    const result = await insertMaterialCompletionInteractor.execute({ studentId, enrollmentId, materialId });

    if (result.success) {
      return this.ok(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case InsertMaterialCompletionMaterialNotFound:
        return this.notFound('Material not found');
      case InsertMaterialCompletionAlreadyExists:
        return this.badRequest('Already complete');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
