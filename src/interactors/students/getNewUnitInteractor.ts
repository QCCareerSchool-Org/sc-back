import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewUnitRequestDTO = {
  studentId: number;
  enrollmentId: number;
  unitId: string;
};

export type GetNewUnitResponseDTO = {
  /** hex string */
  unitId: string;
  courseId: number;
  unit: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  created: Date;
  assignments: Array<{
    /** hex string */
    assignmentId: string;
    assignment: number;
    title: string | null;
    description: string | null;
    optional: boolean;
  }>;
};

export class GetNewUnitNotFound extends Error { }

export class GetNewUnitInteractor implements IInteractor<GetNewUnitRequestDTO, GetNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, enrollmentId, unitId }: GetNewUnitRequestDTO): Promise<ResultType<GetNewUnitResponseDTO>> {
    try {
      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollmentId,
          enrollment: { studentId },
          unitId: this.uuidService.uuidToBin(unitId),
        },
        include: { assignments: true },
      });

      if (!unit) {
        return Result.fail(new GetNewUnitNotFound());
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        courseId: unit.courseId,
        unit: unit.unit,
        title: unit.title,
        description: unit.description,
        optional: unit.optional,
        created: unit.created,
        assignments: unit.assignments.map(a => ({
          assignmentId: this.uuidService.binToUUID(a.assignmentId),
          assignment: a.assignment,
          title: a.title,
          description: a.description,
          optional: a.optional,
        })),
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
