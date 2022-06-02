import * as yup from 'yup';

import { insertNewTextBoxTemplateInteractor } from '../../interactors/administrators';
import type { InsertNewTextBoxTemplateResponseDTO } from '../../interactors/administrators/insertNewTextBoxTemplateInteractor';
import { InsertNewTextBoxTemplateLinesLessThanOne, InsertNewTextBoxTemplateLinesTooLarge, InsertNewTextBoxTemplateOrderLessThanZero, InsertNewTextBoxTemplateOrderTooLarge, InsertNewTextBoxTemplatePartNotFound, InsertNewTextBoxTemplatePointsLessThanZero, InsertNewTextBoxTemplatePointsTooLarge, InsertNewTextBoxTemplateUnitsEnabled } from '../../interactors/administrators/insertNewTextBoxTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    partId: string;
    description: string | null;
    lines: number | null;
    points: number;
    optional: boolean;
    order: number;
  };
};

type Response = InsertNewTextBoxTemplateResponseDTO;

export class InsertNewTextBoxTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

  protected async executeImpl({ body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertNewTextBoxTemplateInteractor.execute({
      partId: body.partId,
      description: body.description,
      lines: body.lines,
      points: body.points,
      optional: body.optional,
      order: body.order,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewTextBoxTemplatePartNotFound:
        return this.notFound('Part template not found');
      case InsertNewTextBoxTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case InsertNewTextBoxTemplateLinesLessThanOne:
        return this.badRequest('Lines must be greater than or equal to 1');
      case InsertNewTextBoxTemplateLinesTooLarge:
        return this.badRequest('Lines value exceeds maximum');
      case InsertNewTextBoxTemplatePointsLessThanZero:
        return this.badRequest('Points must be greater than or equal to 0');
      case InsertNewTextBoxTemplatePointsTooLarge:
        return this.badRequest('Points value exceeds maximum');
      case InsertNewTextBoxTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to 0');
      case InsertNewTextBoxTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
