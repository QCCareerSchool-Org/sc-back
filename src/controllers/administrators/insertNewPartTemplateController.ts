import * as yup from 'yup';

import { insertNewPartTemplateInteractor } from '../../interactors/administrators';
import { InsertNewPartTemplateAssignmentNotFound, InsertNewPartTemplateDescriptionTooLong, InsertNewPartTemplatePartNumberAlreadyInUse, InsertNewPartTemplatePartNumberLessThanOne, InsertNewPartTemplatePartNumberTooLarge, InsertNewPartTemplatePartTitleEmpty, InsertNewPartTemplatePartTitleTooLong, InsertNewPartTemplateResponseDTO } from '../../interactors/administrators/insertNewPartTemplateInteractor';
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
  };
  body: {
    title: string;
    description: string | null;
    partNumber: number;
    optional: boolean;
  };
};

type Response = InsertNewPartTemplateResponseDTO;

export class InsertNewPartTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      title: yup.string().defined(),
      description: yup.string().nullable(true).defined(),
      partNumber: yup.number().defined(),
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
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId } = params;

    const result = await insertNewPartTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewPartTemplateAssignmentNotFound:
        return this.notFound('Assignment template not found');
      case InsertNewPartTemplatePartTitleEmpty:
        return this.badRequest('Title is empty');
      case InsertNewPartTemplatePartTitleTooLong:
        return this.badRequest('Title exceeds maximum length');
      case InsertNewPartTemplateDescriptionTooLong:
        return this.badRequest('Description exceeds maximum length');
      case InsertNewPartTemplatePartNumberLessThanOne:
        return this.badRequest('Part number must be greater than or equal to 1');
      case InsertNewPartTemplatePartNumberTooLarge:
        return this.badRequest('Part number value exceeds maximum');
      case InsertNewPartTemplatePartNumberAlreadyInUse:
        return this.badRequest('Part number already in use for this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
