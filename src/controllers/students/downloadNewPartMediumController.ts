import * as yup from 'yup';

import { downloadNewPartMediumInteractor } from '../../interactors/students';
import type { DownloadNewPartMediumResponseDTO } from '../../interactors/students/downloadNewPartMediumInteractor';
import { DownloadNewPartMediumFileNotFound, DownloadNewPartMediumFileReadError, DownloadNewPartMediumNotFound } from '../../interactors/students/downloadNewPartMediumInteractor';
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
    mediumId: string;
  };
};

type Response = DownloadNewPartMediumResponseDTO;

export class DownloadNewPartMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { unitId, assignmentId, partId, mediumId } = params;

    const result = await downloadNewPartMediumInteractor.execute({ studentId, courseId, unitId, assignmentId, partId, mediumId });

    if (result.success) {
      if (typeof result.value === 'string') {
        this.res.setHeader('Location', result.value);
        return this.found();
      }
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewPartMediumNotFound:
        return this.notFound('Part medium not found');
      case DownloadNewPartMediumFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewPartMediumFileReadError:
        return this.internalServerError('File read error');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
