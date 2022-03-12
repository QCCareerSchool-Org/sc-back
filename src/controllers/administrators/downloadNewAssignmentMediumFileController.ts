import * as yup from 'yup';

import { downloadNewAssignmentMediumFileInteractor } from '../../interactors/administrators';
import type { DeleteNewAssignmentMediumResponseDTO } from '../../interactors/administrators/deletetNewAssignmentMediumInteractor';
import { DownloadNewAssignmentMediumFileNotFound, DownloadNewAssignmentMediumFileReadError } from '../../interactors/administrators/downloadNewAssignmentMediumFileInteractor';
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
    mediumId: string;
  };
};

type Response = DeleteNewAssignmentMediumResponseDTO;

export class DownloadNewAssignmentMediumFileController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      schoolId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      mediumId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { unitId, assignmentId, mediumId } = params;

    const result = await downloadNewAssignmentMediumFileInteractor.execute({ schoolId, courseId, unitId, assignmentId, mediumId });

    if (result.success) {
      const { data, filename, mimeType, size } = result.value;
      return this.sendFile(data, filename, mimeType, size);
    }

    switch (result.error.constructor) {
      case DownloadNewAssignmentMediumFileNotFound:
        return this.notFound('Assignment medium not found');
      case DownloadNewAssignmentMediumFileReadError:
        return this.internalServerError('Can\'t read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
