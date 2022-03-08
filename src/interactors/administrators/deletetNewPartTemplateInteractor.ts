import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type DeleteNewPartTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
};

export type DeleteNewPartTemplateResponseDTO = void;

export class DeleteNewPartTemplateNotFound extends Error { }

export class DeleteNewPartTemplateInteractor implements IInteractor<DeleteNewPartTemplateRequestDTO, DeleteNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewPartTemplateRequestDTO): Promise<ResultType<DeleteNewPartTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
      });
      if (!partTemplate) {
        return Result.fail(new DeleteNewPartTemplateNotFound());
      }

      // delete the part template
      await this.prisma.newPartTemplate.delete({ where: { partTemplateId: partIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
