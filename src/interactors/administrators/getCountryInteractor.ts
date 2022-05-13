import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CountryDTO } from '../../domain/countryDTO';
import type { ILoggerService } from '../../services/logger';
import { Result } from '../result';
import type { ResultType } from '../result';

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
