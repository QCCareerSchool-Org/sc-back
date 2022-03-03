import * as yup from 'yup';

import { getNewPartTemplateInteractor } from '../../interactors/administrators';
import { GetNewPartTemplateNotFound, GetNewPartTemplateResponseDTO } from '../../interactors/administrators/getNewPartTemplateInteractor';
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
};

type Response = GetNewPartTemplateResponseDTO;

export class GetNewPartTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      return { params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    const schoolId = parseInt(params.schoolId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, partId } = params;

    const result = await getNewPartTemplateInteractor.execute({ schoolId, courseId, unitId, assignmentId, partId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewPartTemplateNotFound:
        return this.notFound('Part template not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
