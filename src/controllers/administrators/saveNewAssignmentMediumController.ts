import * as yup from 'yup';

import { saveNewAssignmentMediumInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewAssignmentMediumResponseDTO } from '../../interactors/administrators/saveNewAssignmentMediumInteractor.js';
import { SaveNewAssignmentMediumNotFound, SaveNewAssignmentMediumOrderLessThanZero, SaveNewAssignmentMediumOrderTooLarge, SaveNewAssignmentMediumPartCaptionEmpty, SaveNewAssignmentMediumPartCaptionTooLong, SaveNewAssignmentMediumUnitsEnabled } from '../../interactors/administrators/saveNewAssignmentMediumInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    mediumId: string;
  };
  body: {
    caption: string;
    order: number;
  };
};

type Response = SaveNewAssignmentMediumResponseDTO;

export class SaveNewAssignmentMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      mediumId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      caption: yup.string().defined(),
      order: yup.number().defined(),
    });
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await saveNewAssignmentMediumInteractor.execute({
      mediumId: params.mediumId,
      caption: body.caption,
      order: body.order,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewAssignmentMediumNotFound:
        return this.notFound('Assignment medium not found');
      case SaveNewAssignmentMediumUnitsEnabled:
        return this.internalServerError('Units must be disabled');
      case SaveNewAssignmentMediumPartCaptionEmpty:
        return this.internalServerError('Caption is empty');
      case SaveNewAssignmentMediumPartCaptionTooLong:
        return this.internalServerError('Caption exceeds maximum length');
      case SaveNewAssignmentMediumOrderLessThanZero:
        return this.internalServerError('Order is less than zero');
      case SaveNewAssignmentMediumOrderTooLarge:
        return this.internalServerError('Order value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
