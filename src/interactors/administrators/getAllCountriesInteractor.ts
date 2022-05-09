import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CountryDTO } from '../../domain/countryDTO';
import type { ILoggerService } from '../../services/logger';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetAllCountriesRequestDTO = never;

export type GetAllCountriesResponseDTO = CountryDTO[];

export class GetAllCountriesInteractor implements IInteractor<GetAllCountriesRequestDTO, GetAllCountriesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<GetAllCountriesResponseDTO>> {
    try {
      const courses = await this.prisma.country.findMany({
        orderBy: [ { name: 'asc' } ],
      });

      return Result.success(courses.map(c => ({
        countryId: c.countryId,
        code: c.code,
        name: c.name,
        entityVersion: c.entityVersion,
      })));

    } catch (err) {
      this.logger.error('error getting countries', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
