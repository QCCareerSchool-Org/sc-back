import * as yup from 'yup';

import { insertNewPartMediumInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewPartMediumResponseDTO } from '../../interactors/administrators/insertNewPartMediumInteractor.js';
import { InsertNewPartMediumCaptionEmpty, InsertNewPartMediumCaptionTooLong, InsertNewPartMediumDataMissing, InsertNewPartMediumExternalDataInvalid, InsertNewPartMediumFileSaveError, InsertNewPartMediumInvalidContentLength, InsertNewPartMediumInvalidMimeType, InsertNewPartMediumMissingContentLength, InsertNewPartMediumMissingContentType, InsertNewPartMediumOrderLessThanZero, InsertNewPartMediumOrderTooLarge, InsertNewPartMediumPartNotFound, InsertNewPartMediumSubmissionsEnabled, InsertNewPartMediumUnableToFetchExternalData, InsertNewPartMediumUnacceptableMimeType } from '../../interactors/administrators/insertNewPartMediumInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    partId: string;
    caption: string;
    order: number;
    externalData?: string;
  };
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  };
};

type Response = InsertNewPartMediumResponseDTO;

export class InsertNewPartMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    }).required();
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      caption: yup.string().defined(),
      order: yup.number().defined(),
      externalData: yup.string(),
    }).required();
    const fileSchema: yup.SchemaOf<Omit<Request['file'], 'buffer'>> = yup.object({
      fieldname: yup.string().defined(),
      originalname: yup.string().defined(),
      encoding: yup.string().defined(),
      mimetype: yup.string().defined(),
      // buffer: yup.object<any>().defined(),
      size: yup.number().defined(),
    });
    try {
      if (this.req.file) {
        const [ params, body, file ] = await Promise.all([
          paramsSchema.validate(this.req.params),
          bodySchema.validate(this.req.body),
          fileSchema.validate(this.req.file),
        ]);
        return { params, body, file: file as Request['file'] };
      }
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body, file }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const fileData = file
      ? { filename: file.originalname, data: file.buffer, mimeType: file.mimetype, size: file.size }
      : undefined;

    const result = await insertNewPartMediumInteractor.execute({
      partId: body.partId,
      caption: body.caption,
      order: body.order,
      externalData: body.externalData,
      fileData,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewPartMediumPartNotFound:
        return this.badRequest('Part template not found');
      case InsertNewPartMediumSubmissionsEnabled:
        return this.badRequest('Submissions must be disabled');
      case InsertNewPartMediumCaptionEmpty:
        return this.badRequest('Caption cannot be empty');
      case InsertNewPartMediumCaptionTooLong:
        return this.badRequest('Caption value exceeds maximum length');
      case InsertNewPartMediumOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to zero');
      case InsertNewPartMediumOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      case InsertNewPartMediumExternalDataInvalid:
        return this.badRequest('Invalid url for external data');
      case InsertNewPartMediumDataMissing:
        return this.badRequest('Data missing');
      case InsertNewPartMediumInvalidMimeType:
        return this.badRequest('Invalid mime type ' + result.error.message);
      case InsertNewPartMediumUnacceptableMimeType:
        return this.badRequest('Unacceptable mime type ' + result.error.message);
      case InsertNewPartMediumFileSaveError:
        return this.internalServerError('Unable to save file');
      case InsertNewPartMediumUnableToFetchExternalData:
        return this.badRequest('Could not fetch external data');
      case InsertNewPartMediumMissingContentType:
        return this.badRequest('Could not determine content type');
      case InsertNewPartMediumMissingContentLength:
        return this.badRequest('Could not determine content length');
      case InsertNewPartMediumInvalidContentLength:
        return this.badRequest('Invalid content length');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
