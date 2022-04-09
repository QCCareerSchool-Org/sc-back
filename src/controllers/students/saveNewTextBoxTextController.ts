import * as yup from 'yup';

import { saveNewTextBoxTextInteractor } from '../../interactors/students';
import type { SaveNewTextBoxTextResponseDTO } from '../../interactors/students/saveNewTextBoxTextInteractor';
import { SaveNewTextBoxTextNotFound, SaveNewTextBoxTextTooLong, SaveNewTextBoxTextUnitSubmitted } from '../../interactors/students/saveNewTextBoxTextInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
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
    text: string;
  };
};

type Response = SaveNewTextBoxTextResponseDTO;

export class SaveNewTextBoxTextController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      textBoxId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      text: yup.string().defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, partId, textBoxId } = params;
    const { text } = body;

    const result = await saveNewTextBoxTextInteractor.execute({ studentId, courseId, unitId, assignmentId, partId, textBoxId, text });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveNewTextBoxTextNotFound:
        return this.notFound('Text box not found');
      case SaveNewTextBoxTextUnitSubmitted:
        return this.badRequest('Unit already submitted');
      case SaveNewTextBoxTextTooLong:
        return this.badRequest('Text exceeds maximum length');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
