import * as yup from 'yup';

import { saveNewUnitTemplateInteractor } from '../../interactors/administrators';
import { SaveNewUnitTemplateInvalidUnitLetter, SaveNewUnitTemplateNotFound, SaveNewUnitTemplateOrderLessThanZero, SaveNewUnitTemplateOrderTooLarge, SaveNewUnitTemplateResponseDTO, SaveNewUnitTemplateUnitLetterAlreadyInUse, SaveNewUnitTemplateUnitLetterEmpty, SaveNewUnitTemplateUnitLetterTooLong } from '../../interactors/administrators/saveNewUnitTemplateInteractor';
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
  };
  body: {
    unitLetter: string;
    title: string;
    description: string | null;
    order: number;
    optional: boolean;
  };
};

type Response = SaveNewUnitTemplateResponseDTO;

export class SaveNewUnitTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      unitLetter: yup.string().defined(),
      title: yup.string().defined(),
      description: yup.string().nullable().defined(),
      order: yup.number().defined(),
      optional: yup.boolean().defined(),
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
    const { unitId } = params;

    const result = await saveNewUnitTemplateInteractor.execute({ schoolId, courseId, unitId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewUnitTemplateNotFound:
        return this.notFound('Part template not found');
      case SaveNewUnitTemplateUnitLetterEmpty:
        return this.badRequest('Unit letter cannot be empty');
      case SaveNewUnitTemplateUnitLetterTooLong:
        return this.badRequest('Unit letter can have at most one character');
      case SaveNewUnitTemplateInvalidUnitLetter:
        return this.badRequest('Invalid unit letter');
      case SaveNewUnitTemplateOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to zero');
      case SaveNewUnitTemplateOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      case SaveNewUnitTemplateUnitLetterAlreadyInUse:
        return this.badRequest('Unit letter already in use for this course');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
