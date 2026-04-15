import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { CountryDTO } from '../../domain/countryDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type GetCountryRequestDTO = {
  countryId: number;
};

export type GetCountryResponseDTO = CountryDTO;

export class GetCountryNotFound extends Error { }

export class GetCountryInteractor implements IInteractor<GetCountryRequestDTO, GetCountryResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ countryId }: GetCountryRequestDTO): Promise<ResultType<GetCountryResponseDTO>> {
    try {
      const country = await this.prisma.country.findFirst({
        where: { countryId },
      });
      if (!country) {
        return failure(new GetCountryNotFound());
      }

      return success({
        countryId: country.countryId,
        code: country.code,
        name: country.name,
        entityVersion: country.entityVersion,
      });

    } catch (err) {
      this.logger.error('error getting country', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
