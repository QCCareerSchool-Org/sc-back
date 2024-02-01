import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { insertMaterialInteractor } from '../../interactors/administrators/index.js';
import type { InsertMaterialResponseDTO } from '../../interactors/administrators/insertMaterialInteractor.js';
import { InsertMaterialContentMissing, InsertMaterialContentPresent, InsertMaterialContentTooLarge, InsertMaterialContentTypeMissing, InsertMaterialCouldNotFetchExternalData, InsertMaterialDescriptionEmpty, InsertMaterialDescriptionTooLong, InsertMaterialExternalDataMissing, InsertMaterialExternalDataPresent, InsertMaterialFileSaveError, InsertMaterialImageTooLarge, InsertMaterialInvalidContentMimeType, InsertMaterialInvalidImageMimeType, InsertMaterialInvalidType, InsertMaterialOrderLessThanZero, InsertMaterialOrderTooLarge, InsertMaterialTitleEmpty, InsertMaterialTitleTooLong, InsertMaterialUnitNotFound } from '../../interactors/administrators/insertMaterialInteractor.js';
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
    unitId: string;
    title: string;
    type: 'lesson' | 'video' | 'download' | 'assignment' | 'scorm2004';
    description: string;
    order: number;
    externalData?: string | null; // because we're accepting multi-part/form-data, we have to accept undefined
    lessonMeta?: {
      minutes: number;
      chapters: number;
      videos: number;
      knowledgeChecks: number;
    };
  };
  files: {
    content?: MulterFile;
    image?: MulterFile;
  };
  privileges?: Privileges;
};

type Response = InsertMaterialResponseDTO;

export class InsertMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
      type: yup.string().oneOf([ 'lesson', 'video', 'download', 'assignment', 'scorm2004' ]).defined() as yup.StringSchema<'lesson' | 'video' | 'download' | 'assignment' | 'scorm2004'>,
      title: yup.string().defined(),
      description: yup.string().defined(),
      order: yup.number().defined(),
      externalData: yup.string().nullable(),
      lessonMeta: yup.object({ // TODO: yup doesn't think this matches the request
        minutes: yup.number(),
        chapters: yup.number(),
        videos: yup.number(),
        knowledgeChecks: yup.number(),
      }),
    }) as unknown as yup.SchemaOf<Request['body']>;
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
      return { params, body, files: { content, image }, privileges: this.res.locals.jwt.studentCenter.privileges };
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

    const result = await insertMaterialInteractor.execute({
      unitId: body.unitId,
      type: body.type,
      title: body.title,
      description: body.description,
      order: body.order,
      externalData: body.externalData ?? null,
      lessonMeta: body.lessonMeta ? {
        minutes: body.lessonMeta.minutes,
        chapters: body.lessonMeta.chapters,
        videos: body.lessonMeta.videos,
        knowledgeChecks: body.lessonMeta.knowledgeChecks,
      } : null,
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
      case InsertMaterialUnitNotFound:
        return this.notFound('Unit not found');
      case InsertMaterialTitleEmpty:
        return this.badRequest('title is empty');
      case InsertMaterialTitleTooLong:
        return this.badRequest('title exceeds maxmimum length');
      case InsertMaterialDescriptionEmpty:
        return this.badRequest('description is empty');
      case InsertMaterialDescriptionTooLong:
        return this.badRequest('description exceeds maxmimum length');
      case InsertMaterialOrderLessThanZero:
        return this.badRequest('order must be greater than or equal to zero');
      case InsertMaterialOrderTooLarge:
        return this.badRequest('order must be greater less than or equal to 127');
      case InsertMaterialInvalidType:
        return this.badRequest('Invalid material type');
      case InsertMaterialExternalDataPresent:
        return this.badRequest('External data is  forbidden for this material type');
      case InsertMaterialExternalDataMissing:
        return this.badRequest('External data is required for this material type');
      case InsertMaterialImageTooLarge: {
        const e = result.error as InsertMaterialImageTooLarge;
        const message = `Image file of size ${e.actualSize} exceeds maximum size of ${e.maxSize}`;
        return this.badRequest(message);
      }
      case InsertMaterialInvalidImageMimeType: {
        const e = result.error as InsertMaterialInvalidImageMimeType;
        return this.badRequest(`${e.mimeType} is an invalid file type for an image file`);
      }
      case InsertMaterialContentPresent:
        return this.badRequest('A content file is forbidden for this material type');
      case InsertMaterialContentMissing:
        return this.badRequest('A content file is required for this material type');
      case InsertMaterialContentTooLarge: {
        const e = result.error as InsertMaterialContentTooLarge;
        const message = `Content file of size ${e.actualSize} exceeds maximum size of ${e.maxSize}`;
        return this.badRequest(message);
      }
      case InsertMaterialInvalidContentMimeType: {
        const e = result.error as InsertMaterialInvalidContentMimeType;
        return this.badRequest(`${e.mimeType} is an invalid file type for a content file`);
      }
      case InsertMaterialFileSaveError:
        return this.internalServerError('Could not save file');
      case InsertMaterialCouldNotFetchExternalData:
        return this.badRequest('Could not access external data');
      case InsertMaterialContentTypeMissing:
        return this.badRequest('Could not determine mime type of external data');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
