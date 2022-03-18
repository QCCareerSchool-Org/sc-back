import * as yup from 'yup';

import { downloadNewAssignmentMediumInteractor } from '../../interactors/students';
import type { DownloadNewAssignmentMediumResponseDTO } from '../../interactors/students/downloadNewAssignmentMediumInteractor';
import { DownloadNewAssignmentMediumFileNotFound, DownloadNewAssignmentMediumFileReadError, DownloadNewAssignmentMediumNotFound } from '../../interactors/students/downloadNewAssignmentMediumInteractor';
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
    mediumId: string;
  };
};

type Response = DownloadNewAssignmentMediumResponseDTO;

export class DownloadNewAssignmentMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { unitId, assignmentId, mediumId } = params;

    const result = await downloadNewAssignmentMediumInteractor.execute({ studentId, courseId, unitId, assignmentId, mediumId });

    if (result.success) {
      if (typeof result.value === 'string') {
        this.res.setHeader('Location', result.value);
        return this.found();
      }
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewAssignmentMediumNotFound:
        return this.notFound('Assignment medium not found');
      case DownloadNewAssignmentMediumFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewAssignmentMediumFileReadError:
        return this.internalServerError('File read error');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
