import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type DeleteNewAssignmentTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
};

export type DeleteNewAssignmentTemplateResponseDTO = void;

export class DeleteNewAssignmentTemplateNotFound extends Error { }

export class DeleteNewAssignmentTemplateInteractor implements IInteractor<DeleteNewAssignmentTemplateRequestDTO, DeleteNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewAssignmentTemplateRequestDTO): Promise<ResultType<DeleteNewAssignmentTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const part = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } },
      });
      if (!part) {
        return Result.fail(new DeleteNewAssignmentTemplateNotFound());
      }

      // delete the assignment template
      await this.prisma.newAssignmentTemplate.delete({ where: { assignmentId: assignmentIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
