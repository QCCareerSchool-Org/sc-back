import * as yup from 'yup';

import type { DownloadMaterialImageResponseDTO } from '../../interactors/administrators/downloadMaterialImageInteractor.js';
import { DownloadMaterialImageFileNotFound, DownloadMaterialImageFileReadError, DownloadMaterialImageNotFound } from '../../interactors/administrators/downloadMaterialImageInteractor.js';
import { downloadMaterialImageInteractor } from '../../interactors/administrators/index.js';
import type { ByteRange } from '../baseController.js';
import { BaseController } from '../baseController.js';

type Request = {
  headers: {
    range?: string;
  };
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialId: string;
  };
};

type Response = DownloadMaterialImageResponseDTO;

export class DownloadMaterialImageController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      range: yup.string(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const { materialId } = params;

    const result = await downloadMaterialImageInteractor.execute({
      materialId,
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
      case DownloadMaterialImageNotFound:
        return this.notFound('Material image not found');
      case DownloadMaterialImageFileNotFound:
        return this.internalServerError('File not found');
      case DownloadMaterialImageFileReadError:
        return this.internalServerError('File read error');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
