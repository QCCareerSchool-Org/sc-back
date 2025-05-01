import * as yup from 'yup';

import type { DownloadTutorIntroResponseDTO } from '../../interactors/students/downloadTutorIntroInteractor.js';
import { DownloadTutorIntroEnrollmentNotFound, DownloadTutorIntroFileNotFound, DownloadTutorIntroFileReadError, DownloadTutorIntroNotClosed, DownloadTutorIntroNotSubmitted, DownloadTutorIntroSkipped, DownloadTutorIntroTutorNotAssigned } from '../../interactors/students/downloadTutorIntroInteractor.js';
import { downloadTutorIntroInteractor } from '../../interactors/students/index.js';
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
  };
};

type Response = DownloadTutorIntroResponseDTO;

export class DownloadTutorIntroController extends StudentController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await downloadTutorIntroInteractor.execute({
      studentId,
      courseId,
      startByte: byteRange?.start,
      endByte: byteRange?.end,
    });

    if (result.success) {
      return this.sendInteractorFileStream(result.value);
    }

    if (this.handleCommonErrors(result.error)) {
      return;
    }

    switch (result.error.constructor) {
      case DownloadTutorIntroEnrollmentNotFound:
      case DownloadTutorIntroTutorNotAssigned:
      case DownloadTutorIntroNotSubmitted:
      case DownloadTutorIntroSkipped:
      case DownloadTutorIntroNotClosed:
        return this.notFound('Intro not found');
      case DownloadTutorIntroFileNotFound:
        return this.internalServerError('File not found');
      case DownloadTutorIntroFileReadError:
        return this.internalServerError('Unable to read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
