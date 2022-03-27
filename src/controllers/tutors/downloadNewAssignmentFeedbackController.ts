import * as yup from 'yup';

import { downloadNewUnitFeedbackInteractor } from '../../interactors/tutors';
import { DownloadNewUnitFeedbackFileNotFound, DownloadNewUnitFeedbackFileReadError, DownloadNewUnitFeedbackNotFound, DownloadNewUnitFeedbackNotSubmitted, DownloadNewUnitFeedbackWrongTutor } from '../../interactors/tutors/downloadNewUnitFeedbackInteractor';
import type { DownloadNewUnitFeedbackResponseDTO } from '../../interactors/tutors/downloadNewUnitFeedbackInteractor';
import type { ByteRange } from '../baseController';
import { BaseController } from '../baseController';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    tutorId: string;
    /** numeric string */
    studentId: string;
    /** numeric string */
    unitId: string;
  };
};

type Response = DownloadNewUnitFeedbackResponseDTO;

export class DownloadNewUnitFeedbackController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      studentId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const tutorId = parseInt(params.tutorId, 10);
    const studentId = parseInt(params.studentId, 10);
    const { unitId } = params;

    const result = await downloadNewUnitFeedbackInteractor.execute({
      tutorId,
      studentId,
      unitId,
      startByte: byteRange?.start,
      endByte: byteRange?.end,
    });

    if (result.success) {
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewUnitFeedbackNotFound:
        return this.notFound('Unit not found');
      case DownloadNewUnitFeedbackNotSubmitted:
        return this.notFound('Unit not found');
      case DownloadNewUnitFeedbackWrongTutor:
        return this.forbidden('No access to this unit');
      case DownloadNewUnitFeedbackFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewUnitFeedbackFileReadError:
        return this.internalServerError('Unable to read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
