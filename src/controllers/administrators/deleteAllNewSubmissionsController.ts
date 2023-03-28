import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import type { DeleteAllNewSubmissionsResponseDTO } from '../../interactors/administrators/deleteAllNewSubmissionsInteractor.js';
import { DeleteAllNewSubmissionsEnrollmentNotFound } from '../../interactors/administrators/deleteAllNewSubmissionsInteractor.js';
import { deleteAllNewSubmissionsInteractor } from '../../interactors/administrators/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    enrollmentId: string;
  };
  privileges?: Privileges;
};

type Response = DeleteAllNewSubmissionsResponseDTO;

export class DeleteAllNewSubmissionsController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      enrollmentId: yup.string().matches(/^\d+$/u).defined(),
    });
    try {
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      const params = await paramsSchema.validate(this.req.params);
      return { params, privileges: this.res.locals.jwt.studentCenter.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, privileges }: Request): Promise<void> {
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const enrollmentId = parseInt(params.enrollmentId, 10);

    const result = await deleteAllNewSubmissionsInteractor.execute({ enrollmentId, privileges });

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case DeleteAllNewSubmissionsEnrollmentNotFound:
        return this.notFound('Enrollment not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
