import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type DeleteNewUnitTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
};

export type DeleteNewUnitTemplateResponseDTO = void;

export class DeleteNewUnitTemplateNotFound extends Error { }

export class DeleteNewUnitTemplateInteractor implements IInteractor<DeleteNewUnitTemplateRequestDTO, DeleteNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewUnitTemplateRequestDTO): Promise<ResultType<DeleteNewUnitTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the unit template
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { unitTemplateId: unitIdBin, course: { courseId, schoolId } },
      });
      if (!unitTemplate) {
        return Result.fail(new DeleteNewUnitTemplateNotFound());
      }

      // delete the unit template
      await this.prisma.newUnitTemplate.delete({ where: { unitTemplateId: unitIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
