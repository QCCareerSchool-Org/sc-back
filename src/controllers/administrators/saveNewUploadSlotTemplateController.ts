import * as yup from 'yup';

import { saveNewUploadSlotTemplateInteractor } from '../../interactors/administrators';
import { SaveNewUploadSlotTemplateAllowedTypesEmpty, SaveNewUploadSlotTemplateInvalidAllowedType, SaveNewUploadSlotTemplateLabelEmpty, SaveNewUploadSlotTemplateNotFound, SaveNewUploadSlotTemplateOrderLessThanZero, SaveNewUploadSlotTemplateOrderTooLarge, SaveNewUploadSlotTemplatePointsLessThanZero, SaveNewUploadSlotTemplatePointsTooLarge, SaveNewUploadSlotTemplateResponseDTO } from '../../interactors/administrators/saveNewUploadSlotTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    schoolId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    unitId: string;
    /** uuid */
    assignmentId: string;
    /** uuid */
    partId: string;
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
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, partId, uploadSlotId } = params;

    const result = await saveNewUploadSlotTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, partId, uploadSlotId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewUploadSlotTemplateNotFound:
        return this.notFound('Upload slot template not found');
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
