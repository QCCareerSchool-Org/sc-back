import * as yup from 'yup';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import { isAccessTokenPayload } from '../../domain/accessTokenPayload.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    materialId: string;
  };
  privileges?: Privileges;
};

type Response = void;

export class DeleteMaterialImageController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      materialId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      if (!isAccessTokenPayload(this.res.locals.jwt)) {
        throw Error('access token not found');
      }
      return { params, privileges: this.res.locals.jwt.studentCenter.privileges };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, privileges }: Request): Promise<void> {
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    return this.ok();

    // const result = await replaceMaterialContentInteractor.execute({
    //   materialId: params.materialId,
    //   fileData: {
    //     path: file.path,
    //     filename: file.originalname,
    //     mimeType: file.mimetype,
    //     size: file.size,
    //   },
    //   privileges,
    // });

    // if (result.success) {
    //   return this.ok(result.value);
    // }

    // switch (result.error.constructor) {
    //   case InsufficientPrivileges:
    //     return this.forbidden('Insufficient privileges');
    //   case ReplaceMaterialContentMaterialNotFound:
    //     return this.notFound('Not found');
    //   case ReplaceMaterialContentTooLarge:
    //     return this.badRequest('File exceeds maximum size');
    //   case ReplaceMaterialContentInvalidMimeType:
    //     return this.badRequest('Invalid file type');
    //   case ReplaceMaterialContentSaveError:
    //     return this.internalServerError('Could not save file');
    //   default:
    //     return this.internalServerError(result.error.message);
    // }
  }
}
