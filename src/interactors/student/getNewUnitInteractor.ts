import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewUnitRequestDTO = {
  studentId: number;
  unitId: string;
};

export type GetNewUnitResponseDTO = {
  /** hex string */
  unitId: string;
  unitLetter: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
  created: Date;
  assignments: Array<{
    /** hex string */
    assignmentId: string;
    /** hex string */
    unitId: string;
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
    complete: boolean;
  }>;
};

export class GetNewUnitNotFound extends Error { }

export class GetNewUnitInteractor implements IInteractor<GetNewUnitRequestDTO, GetNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId }: GetNewUnitRequestDTO): Promise<ResultType<GetNewUnitResponseDTO>> {
    try {
      const unit = await this.prisma.newUnit.findFirst({
        where: {
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
        unitLetter: unit.unitLetter,
        title: unit.title,
        description: unit.description,
        optional: unit.optional,
        complete: unit.complete,
        created: unit.created,
        assignments: unit.assignments.map(a => ({
          assignmentId: this.uuidService.binToUUID(a.assignmentId),
          unitId: this.uuidService.binToUUID(a.unitId),
          assignmentNumber: a.assignmentNumber,
          title: a.title,
          description: a.description,
          optional: a.optional,
          complete: a.complete,
        })),
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
