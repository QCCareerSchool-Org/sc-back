import * as yup from 'yup';

import { insertNewUploadSlotTemplateInteractor } from '../../interactors/administrators';
import { InsertNewUploadSlotTemplateAllowedTypesEmpty, InsertNewUploadSlotTemplateInvalidAllowedType, InsertNewUploadSlotTemplateLabelEmpty, InsertNewUploadSlotTemplateOrderLessThanZero, InsertNewUploadSlotTemplateOrderTooLarge, InsertNewUploadSlotTemplatePartNotFound, InsertNewUploadSlotTemplatePointsLessThanZero, InsertNewUploadSlotTemplatePointsTooLarge, InsertNewUploadSlotTemplateResponseDTO } from '../../interactors/administrators/insertNewUploadSlotTemplateInteractor';
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
  };
  body: {
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
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, partId } = params;

    const result = await insertNewUploadSlotTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, partId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewUploadSlotTemplatePartNotFound:
        return this.notFound('Part template not found');
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
