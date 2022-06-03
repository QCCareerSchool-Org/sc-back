import * as yup from 'yup';

import { saveNewTextBoxTemplateInteractor } from '../../interactors/administrators/index.js';
import type { SaveNewTextBoxTemplateResponseDTO } from '../../interactors/administrators/saveNewTextBoxTemplateInteractor.js';
import { SaveNewTextBoxTemplateLinesLessThanOne, SaveNewTextBoxTemplateLinesTooLarge, SaveNewTextBoxTemplateNotFound, SaveNewTextBoxTemplateOrderLessThanZero, SaveNewTextBoxTemplateOrderTooLarge, SaveNewTextBoxTemplatePointsLessThanZero, SaveNewTextBoxTemplatePointsTooLarge, SaveNewTextBoxTemplateUnitsEnabled } from '../../interactors/administrators/saveNewTextBoxTemplateInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
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

    const result = await saveNewTextBoxTemplateInteractor.execute({
      textBoxId: params.textBoxId,
      description: body.description,
      lines: body.lines,
      points: body.points,
      optional: body.optional,
      order: body.order,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewTextBoxTemplateNotFound:
        return this.notFound('Text box template not found');
      case SaveNewTextBoxTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
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
