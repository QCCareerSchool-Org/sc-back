import * as yup from 'yup';

import { getNewUnitInteractor } from '../../interactors';
import { GetNewUnitNotFound, GetNewUnitResponseDTO } from '../../interactors/student/getNewUnitInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    /** numeric string */
    studentId: string;
    /** hex string */
    unitId: string;
  };
};

type Response = GetNewUnitResponseDTO;

export class GetNewUnitController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      studentId: yup.string().matches(/^\d+$/u).defined(),
      unitId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
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
    const studentId = parseInt(params.studentId, 10);
    const { unitId } = params;

    console.log('request', params);

    const result = await getNewUnitInteractor.execute({ studentId, unitId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case GetNewUnitNotFound:
        return this.notFound('Unit not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
