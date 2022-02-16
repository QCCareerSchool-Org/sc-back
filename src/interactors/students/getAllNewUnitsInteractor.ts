import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetAllNewUnitsRequestDTO = {
  studentId: number;
  enrollmentId: number;
  courseId: number;
};

export type GetAllNewUnitsResponseDTO = Array<{
  unitId: string;
  courseId: number;
  unit: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  created: Date;
}>;

export class GetAllNewUnitsInteractor implements IInteractor<GetAllNewUnitsRequestDTO, GetAllNewUnitsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, enrollmentId, courseId }: GetAllNewUnitsRequestDTO): Promise<ResultType<GetAllNewUnitsResponseDTO>> {
    try {
      const units = await this.prisma.newUnit.findMany({
        where: {
          enrollmentId,
          courseId,
          enrollment: { studentId },
        },
      });

      return Result.success(units.map(u => ({
        unitId: this.uuidService.binToUUID(u.unitId),
        courseId: u.courseId,
        unit: u.unit,
        title: u.title,
        description: u.description,
        optional: u.optional,
        created: u.created,
      })));

    } catch (err) {
      this.logger.error('error getting new units', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
