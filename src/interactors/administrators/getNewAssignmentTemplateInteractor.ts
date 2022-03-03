import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewAssignmentTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
};

export type GetNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO & {
  unit: NewUnitTemplateDTO;
  parts: NewPartTemplateDTO[];
};

export class GetNewAssignmentTemplateNotFound extends Error { }

export class GetNewAssignmentTemplateInteractor implements IInteractor<GetNewAssignmentTemplateRequestDTO, GetNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId }: GetNewAssignmentTemplateRequestDTO): Promise<ResultType<GetNewAssignmentTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);

      const assignment = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } },
        include: {
          unit: true,
          parts: {
            orderBy: [ { partNumber: 'asc' } ],
          },
        },
      });
      if (!assignment) {
        return Result.fail(new GetNewAssignmentTemplateNotFound());
      }

      return Result.success({
        assignmentId: this.uuidService.binToUUID(assignment.assignmentId),
        unitId: this.uuidService.binToUUID(assignment.unitId),
        assignmentNumber: assignment.assignmentNumber,
        title: assignment.title,
        description: assignment.description,
        optional: assignment.optional,
        created: assignment.created,
        modified: assignment.modified,
        unit: {
          unitId: this.uuidService.binToUUID(assignment.unit.unitId),
          courseId: assignment.unit.courseId,
          unitLetter: assignment.unit.unitLetter,
          title: assignment.unit.title,
          description: assignment.unit.description,
          optional: assignment.unit.optional,
          created: assignment.unit.created,
          modified: assignment.unit.modified,
        },
        parts: assignment.parts.map(p => ({
          partId: this.uuidService.binToUUID(p.partId),
          assignmentId: this.uuidService.binToUUID(p.assignmentId),
          partNumber: p.partNumber,
          title: p.title,
          description: p.description,
          optional: p.optional,
          created: p.created,
          modified: p.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
