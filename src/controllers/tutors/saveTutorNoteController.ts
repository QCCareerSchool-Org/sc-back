import * as yup from 'yup';

import { saveTutorNoteInteractor } from '../../interactors/tutors/index.js';
import type { SaveTutorNoteResponseDTO } from '../../interactors/tutors/saveTutorNoteInteractor.js';
import { SaveTutorNoteTooLong } from '../../interactors/tutors/saveTutorNoteInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
  };
  body: {
    note: string | null;
  };
};

type Response = SaveTutorNoteResponseDTO;

export class SaveTutorNoteController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      note: yup.string().nullable().defined(),
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

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { note } = body;

    const result = await saveTutorNoteInteractor.execute({ tutorId, studentId, note });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveTutorNoteTooLong:
        return this.badRequest('Note exceeds maximum length');
      default:
        return this.internalServerError(result.error.message);
    }
  }

}
