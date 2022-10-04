import * as yup from 'yup';

import type { GetVideoResponseDTO } from '../../interactors/students/getVideoInteractor.js';
import { GetVideoNotFound } from '../../interactors/students/getVideoInteractor.js';
import { getVideoInteractor } from '../../interactors/students/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** uuid */
    videoId: string;
  };
};

type Response = GetVideoResponseDTO;

export class GetVideoController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      videoId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const result = await getVideoInteractor.execute({ studentId, videoId: params.videoId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetVideoNotFound:
        return this.notFound('Video not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
