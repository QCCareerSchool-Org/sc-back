import * as yup from 'yup';

import type { DownloadCourseHeaderImageResponseDTO } from '../interactors/downloadCourseHeaderImageInteractor.js';
import { DownloadCourseHeaderImageFileNotFound, DownloadCourseHeaderImageFileReadError } from '../interactors/downloadCourseHeaderImageInteractor.js';
import { downloadCourseHeaderImageInteractor } from '../interactors/index.js';
import type { ByteRange } from './baseController.js';
import { BaseController } from './baseController.js';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    courseId: string;
  };
};

type Response = DownloadCourseHeaderImageResponseDTO;

export class DownloadCourseHeaderImageController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
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

    const courseId = parseInt(params.courseId, 10);

    const result = await downloadCourseHeaderImageInteractor.execute({
      courseId,
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

    switch (result.error.constructor) {
      case DownloadCourseHeaderImageFileNotFound:
        return this.internalServerError('File not found');
      case DownloadCourseHeaderImageFileReadError:
        return this.internalServerError('File read error');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
