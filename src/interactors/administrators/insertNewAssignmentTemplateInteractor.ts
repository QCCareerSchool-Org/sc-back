import type { PrismaClient } from '@prisma/client';
import { v1 } from 'uuid';

import type { IInteractor } from '..';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InsertNewAssignmentTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  data: {
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
  };
};

export type InsertNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO;

export class InsertNewAssignmentTemplateUnitNotFound extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberLessThanOne extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberTooLarge extends Error { }

export class InsertNewAssignmentTemplateInteractor implements IInteractor<InsertNewAssignmentTemplateRequestDTO, InsertNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewAssignmentTemplateRequestDTO): Promise<ResultType<InsertNewAssignmentTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { assignmentNumber, title, description, optional } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the unit template
      const unit = await this.prisma.newUnitTemplate.findFirst({
        where: { unitId: unitIdBin, course: { courseId, schoolId } },
      });
      if (!unit) {
        return Result.fail(new InsertNewAssignmentTemplateUnitNotFound());
      }

      if (assignmentNumber < 1) {
        return Result.fail(new InsertNewAssignmentTemplateAssignmentNumberLessThanOne());
      }
      if (assignmentNumber > 127) {
        return Result.fail(new InsertNewAssignmentTemplateAssignmentNumberTooLarge());
      }

      // insert the assignment
      const insertedAssignment = await this.prisma.newAssignmentTemplate.create({
        data: {
          assignmentId: this.uuidService.uuidToBin(v1()),
          unitId: unitIdBin,
          assignmentNumber,
          title: title?.length ? title : null,
          description: description?.length ? description : null,
          optional,
        },
      });

      return Result.success({
        assignmentId: this.uuidService.binToUUID(insertedAssignment.assignmentId),
        unitId: this.uuidService.binToUUID(insertedAssignment.unitId),
        assignmentNumber: insertedAssignment.assignmentNumber,
        title: insertedAssignment.title,
        description: insertedAssignment.description,
        optional: insertedAssignment.optional,
        created: insertedAssignment.created,
        modified: insertedAssignment.modified,
      });

    } catch (err) {
      this.logger.error('error inserting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
