import * as yup from 'yup';

import { saveNewTextBoxTemplateInteractor } from '../../interactors/administrators';
import { SaveNewTextBoxTemplateLinesLessThanOne, SaveNewTextBoxTemplateLinesTooLarge, SaveNewTextBoxTemplateNotFound, SaveNewTextBoxTemplateOrderLessThanZero, SaveNewTextBoxTemplateOrderTooLarge, SaveNewTextBoxTemplatePointsLessThanZero, SaveNewTextBoxTemplatePointsTooLarge, SaveNewTextBoxTemplateResponseDTO } from '../../interactors/administrators/saveNewTextBoxTemplateInteractor';
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
    textBoxId: string;
  };
  body: {
    description: string | null;
    lines: number | null;
    points: number;
    optional: boolean;
    order: number;
  };
};

type Response = SaveNewTextBoxTemplateResponseDTO;

export class SaveNewTextBoxTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      textBoxId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      description: yup.string().nullable(true).defined(),
      lines: yup.number().nullable(true).defined(),
      points: yup.number().defined(),
      optional: yup.boolean().defined(),
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

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, partId, textBoxId } = params;

    const result = await saveNewTextBoxTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, partId, textBoxId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewTextBoxTemplateNotFound:
        return this.notFound('Text box template not found');
      case SaveNewTextBoxTemplateLinesLessThanOne:
        return this.badRequest('Lines must be greater than or equal to 1');
      case SaveNewTextBoxTemplateLinesTooLarge:
        return this.badRequest('Lines value exceeds maximum');
      case SaveNewTextBoxTemplatePointsLessThanZero:
        return this.badRequest('Points must be greater than or equal to 0');
      case SaveNewTextBoxTemplatePointsTooLarge:
        return this.badRequest('Points value exceeds maximum');
      case SaveNewTextBoxTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to 0');
      case SaveNewTextBoxTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
