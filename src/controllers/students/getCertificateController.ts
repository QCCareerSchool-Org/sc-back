import * as yup from 'yup';

import type { GetCertificateResponseDTO } from '../../interactors/getCertificateInteractor.js';
import { GetCertificateNoDesignation, GetCertificateNoGradDate, GetCertificateNotFound } from '../../interactors/getCertificateInteractor.js';
import { getCertificateInteractor } from '../../interactors/index.js';
import { BaseController } from '../baseController.js';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** numeric string */
    courseId: string;
  };
};

type Response = GetCertificateResponseDTO;

export class GetCertificateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      courseId: yup.string().matches(/^\d+$/u).defined(),
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

    const studentId = parseInt(params.studentId, 10);
    const courseId = parseInt(params.courseId, 10);
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
