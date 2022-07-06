import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { insertNewMaterialInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewMaterialResponseDTO } from '../../interactors/administrators/insertNewMaterialInteractor.js';
import { InsertNewMaterialContentMissing, InsertNewMaterialContentPresent, InsertNewMaterialContentTooLarge, InsertNewMaterialContentTypeMissing, InsertNewMaterialCouldNotFetchExternalData, InsertNewMaterialDescriptionEmpty, InsertNewMaterialDescriptionTooLong, InsertNewMaterialExternalDataMissing, InsertNewMaterialExternalDataPresent, InsertNewMaterialFileSaveError, InsertNewMaterialImageTooLarge, InsertNewMaterialIncorrectUnitType, InsertNewMaterialInvalidContentMimeType, InsertNewMaterialInvalidImageMimeType, InsertNewMaterialInvalidType, InsertNewMaterialOrderLessThanZero, InsertNewMaterialOrderTooLarge, InsertNewMaterialTitleEmpty, InsertNewMaterialTitleTooLong, InsertNewMaterialUnitLetterEmpty, InsertNewMaterialUnitLetterTooLong, InsertNewMaterialUnitNotFound } from '../../interactors/administrators/insertNewMaterialInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type MulterFile = {
  fieldname: string;
  originalname: string;
  size: number;
  mimetype: string;
  /** The folder to which the file has been saved (DiskStorage) */
  destination: string;
  /** The name of the file within the destination (DiskStorage) */
  filename: string;
  /** The full path to the uploaded file (DiskStorage) **/
  path: string;
};

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    /** uuid */
    materialUnitId: string;
    title: string;
    type: 'lesson' | 'video' | 'download' | 'assignment';
    description: string;
    order: number;
    externalData?: string | null; // because we're accepting multi-part/form-data, we have to accept undefined
  };
  files: {
    content?: MulterFile;
    image?: MulterFile;
  };
  privileges?: Privileges;
};

type Response = InsertNewMaterialResponseDTO;

export class InsertNewMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      materialUnitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      type: yup.string().oneOf([ 'lesson', 'video', 'download', 'assignment' ]).defined() as yup.StringSchema<'lesson' | 'video' | 'download' | 'assignment'>,
      title: yup.string().defined(),
      description: yup.string().defined(),
      order: yup.number().defined(),
      externalData: yup.string().nullable(),
    });
    const multerFileSchema: yup.SchemaOf<MulterFile> = yup.object({
      fieldname: yup.string().defined(),
      originalname: yup.string().defined(),
      size: yup.number().defined(),
      mimetype: yup.string().defined(),
      destination: yup.string().defined(),
      filename: yup.string().defined(),
      path: yup.string().defined(),
    });
    try {
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      let content: MulterFile | undefined;
      if (this.req.files && 'content' in this.req.files && this.req.files.content.length > 0) {
        content = await multerFileSchema.validate(this.req.files.content[0]);
      }
      let image: MulterFile | undefined;
      if (this.req.files && 'image' in this.req.files && this.req.files.image.length > 0) {
        image = await multerFileSchema.validate(this.req.files.image[0]);
      }
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body, files: { content, image }, privileges: this.res.locals.jwt.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body, files, privileges }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertNewMaterialInteractor.execute({
      materialUnitId: body.materialUnitId,
      type: body.type,
      title: body.title,
      description: body.description,
      order: body.order,
      externalData: body.externalData ?? null,
      contentFile: typeof files.content === 'undefined' ? undefined : {
        path: files.content.path,
        filename: files.content.originalname,
        mimeType: files.content.mimetype,
        size: files.content.size,
      },
      imageFile: typeof files.image === 'undefined' ? undefined : {
        path: files.image.path,
        filename: files.image.originalname,
        mimeType: files.image.mimetype,
        size: files.image.size,
      },
      privileges,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case InsertNewMaterialUnitNotFound:
        return this.notFound('Unit not found');
      case InsertNewMaterialIncorrectUnitType:
        return this.badRequest('Incorrect unit type');
      case InsertNewMaterialTitleEmpty:
        return this.badRequest('title is empty');
      case InsertNewMaterialTitleTooLong:
        return this.badRequest('title exceeds maxmimum length');
      case InsertNewMaterialDescriptionEmpty:
        return this.badRequest('description is empty');
      case InsertNewMaterialDescriptionTooLong:
        return this.badRequest('description exceeds maxmimum length');
      case InsertNewMaterialUnitLetterEmpty:
        return this.badRequest('unitLetter is empty');
      case InsertNewMaterialUnitLetterTooLong:
        return this.badRequest('unitLetter exceeds maxmimum length');
      case InsertNewMaterialOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case InsertNewMaterialOrderTooLarge:
        return this.badRequest('order must be greater less than or equal to 127');
      case InsertNewMaterialInvalidType:
        return this.badRequest('Invalid material type');
      case InsertNewMaterialExternalDataPresent:
        return this.badRequest('External data is  forbidden for this material type');
      case InsertNewMaterialExternalDataMissing:
        return this.badRequest('External data is required for this material type');
      case InsertNewMaterialImageTooLarge: {
        const e = result.error as InsertNewMaterialImageTooLarge;
        const message = `Image file of size ${e.actualSize} exceeds maximum size of ${e.maxSize}`;
        return this.badRequest(message);
      }
      case InsertNewMaterialInvalidImageMimeType: {
        const e = result.error as InsertNewMaterialInvalidImageMimeType;
        return this.badRequest(`${e.mimeType} is an invalid file type for an image file`);
      }
      case InsertNewMaterialContentPresent:
        return this.badRequest('A content file is forbidden for this material type');
      case InsertNewMaterialContentMissing:
        return this.badRequest('A content file is required for this material type');
      case InsertNewMaterialContentTooLarge: {
        const e = result.error as InsertNewMaterialContentTooLarge;
        const message = `Content file of size ${e.actualSize} exceeds maximum size of ${e.maxSize}`;
        return this.badRequest(message);
      }
      case InsertNewMaterialInvalidContentMimeType: {
        const e = result.error as InsertNewMaterialInvalidContentMimeType;
        return this.badRequest(`${e.mimeType} is an invalid file type for a content file`);
      }
      case InsertNewMaterialFileSaveError:
        return this.internalServerError('Could not save file');
      case InsertNewMaterialCouldNotFetchExternalData:
        return this.badRequest('Could not access external data');
      case InsertNewMaterialContentTypeMissing:
        return this.badRequest('Could not determine mime type of external data');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
