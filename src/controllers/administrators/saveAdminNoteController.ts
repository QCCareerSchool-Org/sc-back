import * as yup from 'yup';

import { saveAdminNoteInteractor } from '../../interactors/administrators/index.js';
import type { SaveAdminNoteResponseDTO } from '../../interactors/administrators/saveAdminNoteInteractor.js';
import { SaveAdminNoteTooLong } from '../../interactors/administrators/saveAdminNoteInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** numeric string */
    studentId: string;
  };
  body: {
    note: string | null;
  };
};

type Response = SaveAdminNoteResponseDTO;

export class SaveAdminNoteController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

    const administratorId = parseInt(params.administratorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { note } = body;

    const result = await saveAdminNoteInteractor.execute({ administratorId, studentId, note });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case SaveAdminNoteTooLong:
        return this.badRequest('Note exceeds maximum length');
      default:
        return this.internalServerError(result.error.message);
    }
  }

}
