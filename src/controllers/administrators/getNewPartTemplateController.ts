import * as yup from 'yup';

import { getNewPartTemplateInteractor } from '../../interactors/administrators';
import type { GetNewPartTemplateResponseDTO } from '../../interactors/administrators/getNewPartTemplateInteractor';
import { GetNewPartTemplateNotFound } from '../../interactors/administrators/getNewPartTemplateInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    administratorId: string;
    /** uuid */
    partId: string;
  };
};

type Response = GetNewPartTemplateResponseDTO;

export class GetNewPartTemplateController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      administratorId: yup.string().matches(/^\d+$/u).defined(),
      partId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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

    const { partId } = params;

    const result = await getNewPartTemplateInteractor.execute({ partId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewPartTemplateNotFound:
        return this.notFound('Part template not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
