import type { PrismaClient } from '@prisma/client';

import type { CountryDTO } from '../../domain/countryDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

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
        return Result.fail(new GetCountryNotFound());
      }

      return Result.success({
        countryId: country.countryId,
        code: country.code,
        name: country.name,
        entityVersion: country.entityVersion,
      });

    } catch (err) {
      this.logger.error('error getting country', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
