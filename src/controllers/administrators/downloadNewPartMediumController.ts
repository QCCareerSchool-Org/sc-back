import * as yup from 'yup';

import { downloadNewPartMediumInteractor } from '../../interactors/administrators';
import type { DownloadNewAssignmentMediumResponseDTO } from '../../interactors/administrators/downloadNewAssignmentMediumInteractor';
import { DownloadNewPartMediumFileNotFound, DownloadNewPartMediumFileReadError, DownloadNewPartMediumNotFound } from '../../interactors/administrators/downloadNewPartMediumInteractor';
import type { ByteRange } from '../baseController';
import { BaseController } from '../baseController';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    mediumId: string;
  };
};

type Response = DownloadNewAssignmentMediumResponseDTO;

export class DownloadNewPartMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
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

    const result = await downloadNewPartMediumInteractor.execute({
      mediumId: params.mediumId,
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
