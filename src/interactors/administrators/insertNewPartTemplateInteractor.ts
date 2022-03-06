import type { PrismaClient } from '@prisma/client';
import { v1 } from 'uuid';

import type { IInteractor } from '..';
import { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InsertNewPartTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  data: {
    partNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
  };
};

export type InsertNewPartTemplateResponseDTO = NewPartTemplateDTO;

export class InsertNewPartTemplateAssignmentNotFound extends Error { }
export class InsertNewPartTemplatePartNumberLessThanOne extends Error { }
export class InsertNewPartTemplatePartNumberTooLarge extends Error { }

export class InsertNewPartTemplateInteractor implements IInteractor<InsertNewPartTemplateRequestDTO, InsertNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewPartTemplateRequestDTO): Promise<ResultType<InsertNewPartTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { partNumber, title, description, optional } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignment = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } },
      });
      if (!assignment) {
        return Result.fail(new InsertNewPartTemplateAssignmentNotFound());
      }

      if (partNumber < 1) {
        return Result.fail(new InsertNewPartTemplatePartNumberLessThanOne());
      }
      if (partNumber > 127) {
        return Result.fail(new InsertNewPartTemplatePartNumberTooLarge());
      }

      // insert the part
      const insertedPart = await this.prisma.newPartTemplate.create({
        data: {
          partId: this.uuidService.uuidToBin(v1()),
          assignmentId: assignmentIdBin,
          partNumber,
          title: title?.length ? title : null,
          description: description?.length ? description : null,
          optional,
        },
      });

      return Result.success({
        partId: this.uuidService.binToUUID(insertedPart.partId),
        assignmentId: this.uuidService.binToUUID(insertedPart.assignmentId),
        partNumber: insertedPart.partNumber,
        title: insertedPart.title,
        description: insertedPart.description,
        optional: insertedPart.optional,
        created: insertedPart.created,
        modified: insertedPart.modified,
      });

    } catch (err) {
      this.logger.error('error inserting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
