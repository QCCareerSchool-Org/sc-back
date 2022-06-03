import * as yup from 'yup';

import { insertNewAssignmentMediumInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewAssignmentMediumResponseDTO } from '../../interactors/administrators/insertNewAssignmentMediumInteractor.js';
import { InsertNewAssignmentMediCaptionTooLong, InsertNewAssignmentMediumAssignmentNotFound, InsertNewAssignmentMediumCaptionEmpty, InsertNewAssignmentMediumDataMissing, InsertNewAssignmentMediumExternalDataInvalid, InsertNewAssignmentMediumFileSaveError, InsertNewAssignmentMediumFileTooLarge, InsertNewAssignmentMediumInvalidContentLength, InsertNewAssignmentMediumInvalidMimeType, InsertNewAssignmentMediumMissingContentLength, InsertNewAssignmentMediumMissingContentType, InsertNewAssignmentMediumOrderLessThanZero, InsertNewAssignmentMediumOrderTooLarge, InsertNewAssignmentMediumUnableToFetchExternalData, InsertNewAssignmentMediumUnacceptableMimeType, InsertNewAssignmentMediumUnitsEnabled } from '../../interactors/administrators/insertNewAssignmentMediumInteractor.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    assignmentId: string;
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

type Response = InsertNewAssignmentMediumResponseDTO;

export class InsertNewAssignmentMediumController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    }).required();
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      assignmentId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
      ? {
        filename: file.originalname,
        data: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      }
      : undefined;

    const result = await insertNewAssignmentMediumInteractor.execute({
      assignmentId: body.assignmentId,
      caption: body.caption,
      order: body.order,
      externalData: body.externalData,
      fileData,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertNewAssignmentMediumAssignmentNotFound:
        return this.badRequest('Assignment template not found');
      case InsertNewAssignmentMediumUnitsEnabled:
        return this.badRequest('Units must be disabled');
      case InsertNewAssignmentMediumCaptionEmpty:
        return this.badRequest('Caption cannot be empty');
      case InsertNewAssignmentMediCaptionTooLong:
        return this.badRequest('Caption value exceeds maximum length');
      case InsertNewAssignmentMediumOrderLessThanZero:
        return this.badRequest('Order must be greater than or equal to zero');
      case InsertNewAssignmentMediumOrderTooLarge:
        return this.badRequest('Order value exceeds maximum');
      case InsertNewAssignmentMediumExternalDataInvalid:
        return this.badRequest('Invalid url for external data');
      case InsertNewAssignmentMediumDataMissing:
        return this.badRequest('Data missing');
      case InsertNewAssignmentMediumFileTooLarge:
        return this.badRequest('File too large');
      case InsertNewAssignmentMediumInvalidMimeType:
        return this.badRequest('Invalid mime type ' + result.error.message);
      case InsertNewAssignmentMediumUnacceptableMimeType:
        return this.badRequest('Unacceptable mime type ' + result.error.message);
      case InsertNewAssignmentMediumFileSaveError:
        return this.internalServerError('Unable to save file');
      case InsertNewAssignmentMediumUnableToFetchExternalData:
        return this.badRequest('Could not fetch external data');
      case InsertNewAssignmentMediumMissingContentType:
        return this.badRequest('Could not determine content type');
      case InsertNewAssignmentMediumMissingContentLength:
        return this.badRequest('Could not determine content length');
      case InsertNewAssignmentMediumInvalidContentLength:
        return this.badRequest('Invalid content length');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
