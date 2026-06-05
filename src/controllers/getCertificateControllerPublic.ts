import { createDecipheriv } from 'crypto';
import * as yup from 'yup';

import type { GetCertificateResponseDTO } from '../interactors/getCertificateInteractor.js';
import { GetCertificateNoDesignation, GetCertificateNoGradDate, GetCertificateNotFound } from '../interactors/getCertificateInteractor.js';
import { getCertificateInteractor } from '../interactors/index.js';
import { BaseController } from './baseController.js';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

type Request = {
  params: {
    /** numeric string */
    signature: string;
  };
};

const decrypt = (ciphertext: string): string => {
  const buf = Buffer.from(ciphertext, 'base64url');

  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
};

type Response = GetCertificateResponseDTO;

export class GetCertificateControllerPublic extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      signature: yup.string().matches(/^[a-zA-Z0-9+/]*={0,2}$/u).defined(),
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      return { params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isGetMethod()) {
      return this.methodNotAllowed();
    }
    const [ studentIdStr, courseIdStr ] = decrypt(params.signature).split(':');
    const studentId = parseInt(studentIdStr, 10);
    const courseId = parseInt(courseIdStr, 10);
    const result = await getCertificateInteractor.execute({ studentId, courseId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetCertificateNotFound:
        return this.notFound('Certificate not found');
      case GetCertificateNoGradDate:
        return this.internalServerError('Graduation date not found');
      case GetCertificateNoDesignation:
        return this.internalServerError('Course designation not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
