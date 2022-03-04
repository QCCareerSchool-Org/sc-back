import * as yup from 'yup';

import { getNewPartTemplateInteractor, saveNewPartTemplateInteractor } from '../../interactors/administrators';
import { SaveNewPartTemplateNotFound, SaveNewPartTemplatePartNumberAlreadyInUse, SaveNewPartTemplateResponseDTO } from '../../interactors/administrators/saveNewPartTemplateInteractor';
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
    partNumber: number;
    title: string;
    description: string | null;
    optional: boolean;
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
      partNumber: yup.number().defined(),
      title: yup.string().defined(),
      description: yup.string().nullable().defined(),
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
    const { unitId, assignmentId, partId } = params;

    const result = await saveNewPartTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, partId, data: body });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewPartTemplateNotFound:
        return this.notFound('Part template not found');
      case SaveNewPartTemplatePartNumberAlreadyInUse:
        return this.badRequest('Part number already in use for this assignment');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
