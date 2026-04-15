import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { CountryDTO } from '../../domain/countryDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type GetAllCountriesRequestDTO = never;

export type GetAllCountriesResponseDTO = CountryDTO[];

export class GetAllCountriesInteractor implements IInteractor<GetAllCountriesRequestDTO, GetAllCountriesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<GetAllCountriesResponseDTO>> {
    try {
      const countries = await this.prisma.country.findMany({
        orderBy: [ { name: 'asc' } ],
      });

      return success(countries.map(c => ({
        countryId: c.countryId,
        code: c.code,
        name: c.name,
        entityVersion: c.entityVersion,
      })));

    } catch (err) {
      this.logger.error('error getting countries', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
