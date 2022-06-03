import * as yup from 'yup';

import { saveNewUploadSlotTemplateInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewUploadSlotTemplateResponseDTO } from '../../interactors/administrators/saveNewUploadSlotTemplateInteractor.js';
import { SaveNewUploadSlotTemplateAllowedTypesEmpty, SaveNewUploadSlotTemplateInvalidAllowedType, SaveNewUploadSlotTemplateLabelEmpty, SaveNewUploadSlotTemplateNotFound, SaveNewUploadSlotTemplateOrderLessThanZero, SaveNewUploadSlotTemplateOrderTooLarge, SaveNewUploadSlotTemplatePointsLessThanZero, SaveNewUploadSlotTemplatePointsTooLarge, SaveNewUploadSlotTemplateUnitsEnabled } from '../../interactors/administrators/saveNewUploadSlotTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    uploadSlotId: string;
  };
  body: {
    label: string;
    allowedTypes: string[];
    points: number;
    optional: boolean;
    order: number;
  };
};

type Response = SaveNewUploadSlotTemplateResponseDTO;

export class SaveNewUploadSlotTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      uploadSlotId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
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

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await saveNewUploadSlotTemplateInteractor.execute({
      uploadSlotId: params.uploadSlotId,
      label: body.label,
      allowedTypes: body.allowedTypes,
      points: body.points,
      optional: body.optional,
      order: body.order,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewUploadSlotTemplateNotFound:
        return this.notFound('Upload slot template not found');
      case SaveNewUploadSlotTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case SaveNewUploadSlotTemplateLabelEmpty:
        return this.badRequest('Label must not be empty');
      case SaveNewUploadSlotTemplateAllowedTypesEmpty:
        return this.badRequest('Allowed types must not be empty');
      case SaveNewUploadSlotTemplateInvalidAllowedType:
        return this.badRequest('Invalid allowed type');
      case SaveNewUploadSlotTemplatePointsLessThanZero:
        return this.badRequest('Points must be greater than or equal to 0');
      case SaveNewUploadSlotTemplatePointsTooLarge:
        return this.badRequest('Points value exceeds maximum');
      case SaveNewUploadSlotTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to 0');
      case SaveNewUploadSlotTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
