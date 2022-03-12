import * as yup from 'yup';

import { saveNewPartTemplateInteractor } from '../../interactors/administrators';
import type { SaveNewPartTemplateResponseDTO } from '../../interactors/administrators/saveNewPartTemplateInteractor';
import { SaveNewPartTemplateDescriptionTooLong, SaveNewPartTemplateDescriptionTypeEmpty, SaveNewPartTemplateInvalidDescriptionType, SaveNewPartTemplateNotFound, SaveNewPartTemplatePartNumberAlreadyInUse, SaveNewPartTemplatePartNumberLessThanOne, SaveNewPartTemplatePartNumberTooLarge, SaveNewPartTemplatePartTitleEmpty, SaveNewPartTemplatePartTitleTooLong, SaveNewPartTemplateUnitsEnabled } from '../../interactors/administrators/saveNewPartTemplateInteractor';
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
    title: string;
    description: string | null;
    descriptionType: string;
    partNumber: number;
  };
};

type Response = SaveNewPartTemplateResponseDTO;

export class SaveNewPartTemplateController extends BaseController<Request, Response> {

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
      title: yup.string().defined(),
      description: yup.string().nullable().defined(),
      descriptionType: yup.string().defined(),
      partNumber: yup.number().defined(),
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
    const { unitId, assignmentId, partId } = params;

    const result = await saveNewPartTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, partId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewPartTemplateNotFound:
        return this.notFound('Part template not found');
      case SaveNewPartTemplateUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case SaveNewPartTemplatePartTitleEmpty:
        return this.badRequest('Title is empty');
      case SaveNewPartTemplatePartTitleTooLong:
        return this.badRequest('Title exceeds maximum length');
      case SaveNewPartTemplateDescriptionTooLong:
        return this.badRequest('Description exceeds maximum length');
      case SaveNewPartTemplateDescriptionTypeEmpty:
        return this.badRequest('Description type is empty');
      case SaveNewPartTemplateInvalidDescriptionType:
        return this.badRequest('Invalid description type');
      case SaveNewPartTemplatePartNumberLessThanOne:
        return this.badRequest('Part number must be greater than or equal to one');
      case SaveNewPartTemplatePartNumberTooLarge:
        return this.badRequest('Part number value exceeds maximum');
      case SaveNewPartTemplatePartNumberAlreadyInUse:
        return this.badRequest('Part number already in use for this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
