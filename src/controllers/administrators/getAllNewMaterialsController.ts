import * as yup from 'yup';

import type { GetAllNewMaterialsResponseDTO } from '../../interactors/administrators/getAllNewMaterialsInteractor.js';
import { getAllNewMaterialsInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  query: {
    /** numeric string */
    courseId: string;
  };
};

type Response = GetAllNewMaterialsResponseDTO;

export class GetAllNewMaterialsController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const querySchema: yup.SchemaOf<Request['query']> = yup.object({
      courseId: yup.string().matches(/^\d+$/u).defined(),
    });
    try {
      const [ params, query ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        querySchema.validate(this.req.query),
      ]);
      return { params, query };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ query }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const courseId = parseInt(query.courseId, 10);

    const result = await getAllNewMaterialsInteractor.execute({ courseId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
