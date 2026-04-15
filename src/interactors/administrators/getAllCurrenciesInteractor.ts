import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { CurrencyDTO } from '../../domain/currencyDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type GetAllCurrenciesRequestDTO = never;

export type GetAllCurrenciesResponseDTO = CurrencyDTO[];

export class GetAllCurrenciesInteractor implements IInteractor<GetAllCurrenciesRequestDTO, GetAllCurrenciesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<GetAllCurrenciesResponseDTO>> {
    try {
      const currencies = await this.prisma.currency.findMany();

      return success(currencies.map(c => ({
        currencyId: c.currencyId,
        code: c.code,
        name: c.name,
        symbol: c.symbol,
      })));

    } catch (err) {
      this.logger.error('error getting currencies', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
