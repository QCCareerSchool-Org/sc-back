import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { insertNewMaterialUnitInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewMaterialUnitResponseDTO } from '../../interactors/administrators/insertNewMaterialUnitInteractor.js';
import { InsertNewMaterialUnitCourseNotFound, InsertNewMaterialUnitIncorrectUnitType, InsertNewMaterialUnitOrderLessThanZero, InsertNewMaterialUnitOrderTooLarge, InsertNewMaterialUnitTitleEmpty, InsertNewMaterialUnitTitleTooLong, InsertNewMaterialUnitUnitLetterAlreadyExists, InsertNewMaterialUnitUnitLetterEmpty, InsertNewMaterialUnitUnitLetterTooLong } from '../../interactors/administrators/insertNewMaterialUnitInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    courseId: number;
    unitLetter: string;
    title: string | null;
    order: number;
  };
  privileges?: Privileges;
};

type Response = InsertNewMaterialUnitResponseDTO;

export class InsertNewMaterialUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      courseId: yup.number().defined(),
      unitLetter: yup.string().defined(),
      title: yup.string().nullable().defined(),
      order: yup.number().defined(),
    });
    try {
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
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

  protected async executeImpl({ body, privileges }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertNewMaterialUnitInteractor.execute({
      courseId: body.courseId,
      unitLetter: body.unitLetter,
      title: body.title,
      order: body.order,
      privileges,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case InsertNewMaterialUnitCourseNotFound:
        return this.badRequest('Course not found');
      case InsertNewMaterialUnitIncorrectUnitType:
        return this.badRequest('Course has incorrect unit type');
      case InsertNewMaterialUnitTitleEmpty:
        return this.badRequest('Title is empty');
      case InsertNewMaterialUnitTitleTooLong:
        return this.badRequest('Title exceeds maxmimum length');
      case InsertNewMaterialUnitUnitLetterEmpty:
        return this.badRequest('UnitLetter is empty');
      case InsertNewMaterialUnitUnitLetterTooLong:
        return this.badRequest('UnitLetter exceeds maxmimum length');
      case InsertNewMaterialUnitOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case InsertNewMaterialUnitOrderTooLarge:
        return this.badRequest('Order must be greater less than or equal to 127');
      case InsertNewMaterialUnitUnitLetterAlreadyExists:
        return this.badRequest('Unit letter already exists');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
