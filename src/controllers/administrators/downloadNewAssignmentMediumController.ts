import * as yup from 'yup';

import { downloadNewAssignmentMediumInteractor } from '../../interactors/administrators';
import type { DeleteNewAssignmentMediumResponseDTO } from '../../interactors/administrators/deletetNewAssignmentMediumInteractor';
import { DownloadNewAssignmentMediumFileNotFound, DownloadNewAssignmentMediumFileReadError, DownloadNewAssignmentMediumNotFound } from '../../interactors/administrators/downloadNewAssignmentMediumInteractor';
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

export class DownloadNewAssignmentMediumController extends BaseController<Request, Response> {

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

    const result = await downloadNewAssignmentMediumInteractor.execute({ schoolId, courseId, unitId, assignmentId, mediumId });

    if (result.success) {
      const { stream, filename, mimeType, size, lastModified, maxAge } = result.value;
      this.res.setHeader('Last-Modified', this.formatHeaderDate(lastModified));
      if (typeof size !== 'undefined') {
        this.res.setHeader('Content-Length', size);
      }
      this.res.setHeader('Content-Type', mimeType);
      this.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      this.res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      stream.pipe(this.res);
      return;
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
