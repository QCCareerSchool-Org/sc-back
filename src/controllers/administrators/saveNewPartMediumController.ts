import * as yup from 'yup';

import { saveNewPartMediumInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewPartMediumResponseDTO } from '../../interactors/administrators/saveNewPartMediumInteractor.js';
import { SaveNewPartMediumNotFound, SaveNewPartMediumOrderLessThanZero, SaveNewPartMediumOrderTooLarge, SaveNewPartMediumPartCaptionEmpty, SaveNewPartMediumPartCaptionTooLong, SaveNewPartMediumUnitsEnabled } from '../../interactors/administrators/saveNewPartMediumInteractor.js';
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

type Response = SaveNewPartMediumResponseDTO;

export class SaveNewPartMediumController extends BaseController<Request, Response> {

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

    const result = await saveNewPartMediumInteractor.execute({
      mediumId: params.mediumId,
      caption: body.caption,
      order: body.order,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewPartMediumNotFound:
        return this.notFound('Part medium not found');
      case SaveNewPartMediumUnitsEnabled:
        return this.internalServerError('Units must be disabled');
      case SaveNewPartMediumPartCaptionEmpty:
        return this.internalServerError('Caption is empty');
      case SaveNewPartMediumPartCaptionTooLong:
        return this.internalServerError('Caption exceeds maximum length');
      case SaveNewPartMediumOrderLessThanZero:
        return this.internalServerError('Order is less than zero');
      case SaveNewPartMediumOrderTooLarge:
        return this.internalServerError('Order value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
