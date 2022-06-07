import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { insertNewMaterialInteractor } from '../../interactors/administrators/index.js';
import type { InsertNewMaterialResponseDTO } from '../../interactors/administrators/insertNewMaterialInteractor.js';
import { InsertNewMaterialContentTypeMissing, InsertNewMaterialCouldNotFetchExternalData, InsertNewMaterialCourseNotFound, InsertNewMaterialDescriptionEmpty, InsertNewMaterialDescriptionTooLong, InsertNewMaterialExternalDataMissing, InsertNewMaterialExternalDataPresent, InsertNewMaterialFileMissing, InsertNewMaterialFilePresent, InsertNewMaterialFileSaveError, InsertNewMaterialFileTooLarge, InsertNewMaterialIncorrectUnitType, InsertNewMaterialInvalidMimeType, InsertNewMaterialInvalidType, InsertNewMaterialOrderLessThanZero, InsertNewMaterialOrderTooLarge, InsertNewMaterialTitleEmpty, InsertNewMaterialTitleTooLong, InsertNewMaterialUnitLetterEmpty, InsertNewMaterialUnitLetterTooLong } from '../../interactors/administrators/insertNewMaterialInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
  };
  body: {
    courseId: number;
    title: string;
    type: 'lesson' | 'video' | 'download' | 'assignment';
    description: string;
    unitLetter: string;
    order: number;
    externalData?: string | null; // because we're accepting multi-part/form-data, we have to accept undefined
  };
  file?: {
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
  privileges?: Privileges;
};

type Response = InsertNewMaterialResponseDTO;

export class InsertNewMaterialController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      courseId: yup.number().defined(),
      type: yup.string().oneOf([ 'lesson', 'video', 'download', 'assignment' ]).defined() as yup.StringSchema<'lesson' | 'video' | 'download' | 'assignment'>,
      title: yup.string().defined(),
      description: yup.string().defined(),
      unitLetter: yup.string().defined(),
      order: yup.number().defined(),
      externalData: yup.string().nullable(),
    });
    const fileSchema: yup.SchemaOf<Request['file']> = yup.object({
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
      if (this.req.file) {
        const [ params, body, file ] = await Promise.all([
          paramsSchema.validate(this.req.params),
          bodySchema.validate(this.req.body),
          fileSchema.validate(this.req.file),
        ]);
        return { params, body, file, privileges: this.res.locals.jwt.privileges };
      }
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body, privileges: this.res.locals.jwt.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body, file, privileges }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await insertNewMaterialInteractor.execute({
      courseId: body.courseId,
      type: body.type,
      title: body.title,
      description: body.description,
      unitLetter: body.unitLetter,
      order: body.order,
      externalData: body.externalData ?? null,
      fileData: typeof file === 'undefined' ? undefined : {
        path: file.path,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      privileges,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case InsertNewMaterialCourseNotFound:
        return this.notFound('Course not found');
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
      case InsertNewMaterialFilePresent:
        return this.badRequest('A file is forbidden for this material type');
      case InsertNewMaterialFileMissing:
        return this.badRequest('A file is required for this material type');
      case InsertNewMaterialFileTooLarge: {
        const e = result.error as InsertNewMaterialFileTooLarge;
        const message = `File of size ${e.actualSize} exceeds maximum size of ${e.maxSize}`;
        return this.badRequest(message);
      }
      case InsertNewMaterialInvalidMimeType: {
        const e = result.error as InsertNewMaterialInvalidMimeType;
        return this.badRequest(`${e.mimeType} is an invalid file type`);
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
