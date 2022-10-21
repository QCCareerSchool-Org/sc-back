import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { saveMaterialInteractor } from '../../interactors/administrators/index.js';
import type { SaveMaterialResponseDTO } from '../../interactors/administrators/saveMaterialInteractor.js';
import { SaveMaterialDescriptionEmpty, SaveMaterialDescriptionTooLong, SaveMaterialMissingMetadata, SaveMaterialNotFound, SaveMaterialOrderLessThanZero, SaveMaterialOrderTooLarge, SaveMaterialTitleEmpty, SaveMaterialTitleTooLong } from '../../interactors/administrators/saveMaterialInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialId: string;
  };
  body: {
    title: string;
    description: string;
    order: number;
    lessonMeta?: {
      minutes: number;
      chapters: number;
      videos: number;
      knowledgeChecks: number;
    };
  };
  privileges?: Privileges;
};

type Response = SaveMaterialResponseDTO;

export class SaveMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      title: yup.string().defined(),
      description: yup.string().defined(),
      order: yup.number().defined(),
      lessonMeta: yup.object({ // TODO: yup doesn't think this matches the request
        minutes: yup.number(),
        chapters: yup.number(),
        videos: yup.number(),
        knowledgeChecks: yup.number(),
      }),
    }) as unknown as yup.SchemaOf<Request['body']>;
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      return { params, body, privileges: this.res.locals.jwt.studentCenter.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, body, privileges }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await saveMaterialInteractor.execute({
      materialId: params.materialId,
      title: body.title,
      description: body.description,
      order: body.order,
      privileges,
      lessonMeta: body.lessonMeta ? {
        minutes: body.lessonMeta.minutes,
        chapters: body.lessonMeta.chapters,
        videos: body.lessonMeta.videos,
        knowledgeChecks: body.lessonMeta.knowledgeChecks,
      } : null,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case SaveMaterialNotFound:
        return this.notFound('Course not found');
      case SaveMaterialTitleEmpty:
        return this.badRequest('title is empty');
      case SaveMaterialTitleTooLong:
        return this.badRequest('title exceeds maxmimum length');
      case SaveMaterialDescriptionEmpty:
        return this.badRequest('description is empty');
      case SaveMaterialDescriptionTooLong:
        return this.badRequest('description exceeds maxmimum length');
      case SaveMaterialOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case SaveMaterialOrderTooLarge:
        return this.badRequest('order must be greater less than or equal to 127');
      case SaveMaterialMissingMetadata:
        return this.badRequest('lesson metadata is missing');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
