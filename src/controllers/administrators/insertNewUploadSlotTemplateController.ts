import * as yup from 'yup';

import { insertNewUploadSlotTemplateInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewUploadSlotTemplateResponseDTO } from '../../interactors/administrators/insertNewUploadSlotTemplateInteractor.js';
import { InsertNewUploadSlotTemplateAllowedTypesEmpty, InsertNewUploadSlotTemplateInvalidAllowedType, InsertNewUploadSlotTemplateLabelEmpty, InsertNewUploadSlotTemplateOrderLessThanZero, InsertNewUploadSlotTemplateOrderTooLarge, InsertNewUploadSlotTemplatePartNotFound, InsertNewUploadSlotTemplatePointsLessThanZero, InsertNewUploadSlotTemplatePointsTooLarge, InsertNewUploadSlotTemplateSubmissionsEnabled } from '../../interactors/administrators/insertNewUploadSlotTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    partId: string;
    label: string;
    allowedTypes: string[];
    points: number;
    optional: boolean;
    order: number;
  };
};

type Response = InsertNewUploadSlotTemplateResponseDTO;

export class InsertNewUploadSlotTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      label: yup.string().defined(),
      allowedTypes: yup.array().of(yup.string().defined()).defined(),
      points: yup.number().defined(),
      optional: yup.boolean().defined(),
      order: yup.number().defined(),
    });
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body: body as Request['body'] }; // as Request['body'] temporary workaround for yup bug
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertNewUploadSlotTemplateInteractor.execute({
      partId: body.partId,
      label: body.label,
      allowedTypes: body.allowedTypes,
      points: body.points,
      optional: body.optional,
      order: body.order,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewUploadSlotTemplatePartNotFound:
        return this.notFound('Part template not found');
      case InsertNewUploadSlotTemplateSubmissionsEnabled:
        return this.badRequest('Submissions must be disabled');
      case InsertNewUploadSlotTemplateLabelEmpty:
        return this.badRequest('Label must not be empty');
      case InsertNewUploadSlotTemplateAllowedTypesEmpty:
        return this.badRequest('Allowed types must not be empty');
      case InsertNewUploadSlotTemplateInvalidAllowedType:
        return this.badRequest('Invalid allowed type');
      case InsertNewUploadSlotTemplatePointsLessThanZero:
        return this.badRequest('Points must be greater than or equal to 0');
      case InsertNewUploadSlotTemplatePointsTooLarge:
        return this.badRequest('Points value exceeds maximum');
      case InsertNewUploadSlotTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to 0');
      case InsertNewUploadSlotTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
