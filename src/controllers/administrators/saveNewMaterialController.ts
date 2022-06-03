import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { saveNewMaterialInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewMaterialResponseDTO } from '../../interactors/administrators/saveNewMaterialInteractor.js';
import { SaveNewMaterialDescriptionEmpty, SaveNewMaterialDescriptionTooLong, SaveNewMaterialNotFound, SaveNewMaterialOrderLessThanZero, SaveNewMaterialOrderTooLarge, SaveNewMaterialTitleEmpty, SaveNewMaterialTitleTooLong, SaveNewMaterialUnitLetterEmpty, SaveNewMaterialUnitLetterTooLong } from '../../interactors/administrators/saveNewMaterialInteractor.js';
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
    courseId: number;
    title: string;
    description: string;
    unitLetter: string;
    order: number;
  };
  privileges?: Privileges;
};

type Response = SaveNewMaterialResponseDTO;

export class SaveNewMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      courseId: yup.number().defined(),
      title: yup.string().defined(),
      description: yup.string().defined(),
      unitLetter: yup.string().defined(),
      order: yup.number().defined(),
    });
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      return { params, body, privileges: this.res.locals.jwt.privileges };
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

    const result = await saveNewMaterialInteractor.execute({
      materialId: params.materialId,
      courseId: body.courseId,
      title: body.title,
      description: body.description,
      unitLetter: body.unitLetter,
      order: body.order,
      privileges,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case SaveNewMaterialNotFound:
        return this.notFound('Course not found');
      case SaveNewMaterialTitleEmpty:
        return this.badRequest('title is empty');
      case SaveNewMaterialTitleTooLong:
        return this.badRequest('title exceeds maxmimum length');
      case SaveNewMaterialDescriptionEmpty:
        return this.badRequest('description is empty');
      case SaveNewMaterialDescriptionTooLong:
        return this.badRequest('description exceeds maxmimum length');
      case SaveNewMaterialUnitLetterEmpty:
        return this.badRequest('unitLetter is empty');
      case SaveNewMaterialUnitLetterTooLong:
        return this.badRequest('unitLetter exceeds maxmimum length');
      case SaveNewMaterialOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case SaveNewMaterialOrderTooLarge:
        return this.badRequest('order must be greater less than or equal to 127');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
