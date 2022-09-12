import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { saveUnitInteractor } from '../../interactors/administrators/index.js';
import type { SaveUnitResponseDTO } from '../../interactors/administrators/saveUnitInteractor.js';
import { SaveUnitNotFound, SaveUnitOrderLessThanZero, SaveUnitOrderTooLarge, SaveUnitTitleEmpty, SaveUnitTitleTooLong, SaveUnitUnitLetterAlreadyInUse, SaveUnitUnitLetterEmpty, SaveUnitUnitLetterTooLong } from '../../interactors/administrators/saveUnitInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    unitId: string;
  };
  body: {
    title: string | null;
    unitLetter: string;
    order: number;
  };
  privileges?: Privileges;
};

type Response = SaveUnitResponseDTO;

export class SaveUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      title: yup.string().nullable().defined(),
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

    const result = await saveUnitInteractor.execute({
      unitId: params.unitId,
      title: body.title,
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
      case SaveUnitNotFound:
        return this.notFound('Course not found');
      case SaveUnitTitleEmpty:
        return this.badRequest('title is empty');
      case SaveUnitTitleTooLong:
        return this.badRequest('title exceeds maxmimum length');
      case SaveUnitUnitLetterEmpty:
        return this.badRequest('unitLetter is empty');
      case SaveUnitUnitLetterTooLong:
        return this.badRequest('unitLetter exceeds maxmimum length');
      case SaveUnitOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case SaveUnitOrderTooLarge:
        return this.badRequest('order must be greater less than or equal to 127');
      case SaveUnitUnitLetterAlreadyInUse:
        return this.badRequest('unit letter already in use');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
