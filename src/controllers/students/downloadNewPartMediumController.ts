import * as yup from 'yup';

import type { DownloadNewPartMediumResponseDTO } from '../../interactors/students/downloadNewPartMediumInteractor.js';
import { DownloadNewPartMediumFileNotFound, DownloadNewPartMediumFileReadError, DownloadNewPartMediumNotFound } from '../../interactors/students/downloadNewPartMediumInteractor.js';
import { downloadNewPartMediumInteractor } from '../../interactors/students/index.js';
import type { ByteRange } from '../baseController.js';
import { StudentController } from './index.js';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
    /** uuid */
    submissionId: string;
    /** uuid */
    assignmentId: string;
    /** uuid */
    partId: string;
    /** uuid */
    mediumId: string;
  };
};

type Response = DownloadNewPartMediumResponseDTO;

export class DownloadNewPartMediumController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
      submissionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      mediumId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      const [ headers, params ] = await Promise.all([
        headersSchema.validate(this.req.headers),
        paramsSchema.validate(this.req.params),
      ]);
      return { headers, params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ headers, params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }

    let byteRange: ByteRange | false | undefined;
    if (headers.range?.startsWith('bytes=')) {
      byteRange = this.getByteRange(headers.range);
    }
    if (byteRange === false) {
      return this.rangeNotSatisfiable();
    }

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
    const { submissionId, assignmentId, partId, mediumId } = params;

    const result = await downloadNewPartMediumInteractor.execute({
      studentId,
      courseId,
      submissionId,
      assignmentId,
      partId,
      mediumId,
      startByte: byteRange?.start,
      endByte: byteRange?.end,
    });

    if (result.success) {
      if (typeof result.value === 'string') {
        this.res.setHeader('Location', result.value);
        return this.found();
      }
      return this.sendInteractorFileStream(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
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
