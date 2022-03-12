import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { SchoolDTO } from '../../domain/schoolDTO';
import type { ILoggerService } from '../../services/logger';
import type { ResultType } from '../result';
import { Result } from '../result';

export type GetAllSchoolsRequestDTO = void;

export type GetAllSchoolsResponseDTO = SchoolDTO[];

export class GetAllSchoolsInteractor implements IInteractor<GetAllSchoolsRequestDTO, GetAllSchoolsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<GetAllSchoolsResponseDTO>> {
    try {
      const schools = await this.prisma.school.findMany();

      return Result.success(schools.map(s => ({
        schoolId: s.schoolId,
        name: s.name,
        slug: s.slug,
        order: s.order,
        entityVersion: s.entityVersion,
      })));

    } catch (err) {
      this.logger.error('error getting schools', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
