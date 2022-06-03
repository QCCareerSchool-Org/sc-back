import type { PrismaClient } from '@prisma/client';

import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetAllSchoolsRequestDTO = void;

export type GetAllSchoolsResponseDTO = SchoolDTO[];

export class GetAllSchoolsInteractor implements IInteractor<GetAllSchoolsRequestDTO, GetAllSchoolsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<GetAllSchoolsResponseDTO>> {
    try {
      const schools = await this.prisma.school.findMany({
        orderBy: [ { slug: 'asc' } ],
      });

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
