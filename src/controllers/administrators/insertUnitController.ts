import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { insertUnitInteractor } from '../../interactors/administrators/index.js';
import type { InsertUnitResponseDTO } from '../../interactors/administrators/insertUnitInteractor.js';
import { InsertUnitCourseNotFound, InsertUnitIncorrectSubmissionType, InsertUnitOrderLessThanZero, InsertUnitOrderTooLarge, InsertUnitTitleEmpty, InsertUnitTitleTooLong, InsertUnitUnitLetterAlreadyExists, InsertUnitUnitLetterEmpty, InsertUnitUnitLetterTooLong } from '../../interactors/administrators/insertUnitInteractor.js';
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

type Response = InsertUnitResponseDTO;

export class InsertUnitController extends BaseController<Request, Response> {

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

  protected async executeImpl({ body, privileges }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertUnitInteractor.execute({
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
      case InsertUnitCourseNotFound:
        return this.badRequest('Course not found');
      case InsertUnitIncorrectSubmissionType:
        return this.badRequest('Course has incorrect submission type');
      case InsertUnitTitleEmpty:
        return this.badRequest('Title is empty');
      case InsertUnitTitleTooLong:
        return this.badRequest('Title exceeds maxmimum length');
      case InsertUnitUnitLetterEmpty:
        return this.badRequest('UnitLetter is empty');
      case InsertUnitUnitLetterTooLong:
        return this.badRequest('UnitLetter exceeds maxmimum length');
      case InsertUnitOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case InsertUnitOrderTooLarge:
        return this.badRequest('Order must be greater less than or equal to 127');
      case InsertUnitUnitLetterAlreadyExists:
        return this.badRequest('Unit letter already exists');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
