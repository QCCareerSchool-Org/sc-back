import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { replaceNewMaterialFileInteractor } from '../../interactors/administrators/index.js';
import type { ReplaceNewMaterialFileResponseDTO } from '../../interactors/administrators/replaceNewMaterialFileInteractor.js';
import { ReplaceNewMaterialFileInvalidMimeType, ReplaceNewMaterialFileMaterialNotFound, ReplaceNewMaterialFileSaveError, ReplaceNewMaterialFileTooLarge } from '../../interactors/administrators/replaceNewMaterialFileInteractor.js';
import { InsufficientPrivileges } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialId: string;
  };
  file: {
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

type Response = ReplaceNewMaterialFileResponseDTO;

export class ReplaceNewMaterialFileController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
      const [ params, file ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        fileSchema.validate(this.req.file),
      ]);
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      return { params, file, privileges: this.res.locals.jwt.studentCenter.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, file, privileges }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await replaceNewMaterialFileInteractor.execute({
      materialId: params.materialId,
      fileData: {
        path: file.path,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      privileges,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsufficientPrivileges:
        return this.forbidden('Insufficient privileges');
      case ReplaceNewMaterialFileMaterialNotFound:
        return this.notFound('Not found');
      case ReplaceNewMaterialFileTooLarge:
        return this.badRequest('File exceeds maximum size');
      case ReplaceNewMaterialFileInvalidMimeType:
        return this.badRequest('Invalid file type');
      case ReplaceNewMaterialFileSaveError:
        return this.internalServerError('Could not save file');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
