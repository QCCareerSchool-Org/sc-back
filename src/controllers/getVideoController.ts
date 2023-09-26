import * as yup from 'yup';

import type { GetVideoResponseDTO } from '../interactors/getVideoInteractor.js';
import { GetVideoNotFound, GetVideoRestricted } from '../interactors/getVideoInteractor.js';
import { getVideoInteractor } from '../interactors/index.js';
import { BaseController } from './baseController.js';

type Request = {
  params: {
    /** uuid */
    videoId: string;
  };
};

type Response = GetVideoResponseDTO;

export class GetVideoController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
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

    const result = await getVideoInteractor.execute({ videoId: params.videoId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetVideoNotFound:
        return this.notFound('Video not found');
      case GetVideoRestricted:
        return this.forbidden('Video restricted');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
