import * as yup from 'yup';

import type { DownloadNewAssignmentMediumResponseDTO } from '../../interactors/tutors/downloadNewAssignmentMediumInteractor.js';
import { DownloadNewAssignmentMediumFileNotFound, DownloadNewAssignmentMediumFileReadError, DownloadNewAssignmentMediumNotFound } from '../../interactors/tutors/downloadNewAssignmentMediumInteractor.js';
import { downloadNewAssignmentMediumInteractor } from '../../interactors/tutors/index.js';
import type { ByteRange } from '../baseController.js';
import { BaseController } from '../baseController.js';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    tutorId: string;
    /** uuid */
    assignmentMediumId: string;
  };
};

type Response = DownloadNewAssignmentMediumResponseDTO;

export class DownloadNewAssignmentMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      tutorId: yup.string().matches(/^\d+$/u).defined(),
      assignmentMediumId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const { assignmentMediumId } = params;

    const result = await downloadNewAssignmentMediumInteractor.execute({
      tutorId,
      assignmentMediumId,
      startByte: byteRange?.start,
      endByte: byteRange?.end,
    });

    if (result.success) {
      return this.sendInteractorFileStream(result.value);
    }

    switch (result.error.constructor) {
      case DownloadNewAssignmentMediumNotFound:
      case DownloadNewAssignmentMediumFileNotFound:
        return this.internalServerError('File not found');
      case DownloadNewAssignmentMediumFileReadError:
        return this.internalServerError('Unable to read file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
