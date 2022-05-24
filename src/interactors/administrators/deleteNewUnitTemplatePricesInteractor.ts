import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import { InsufficientPrivileges } from '..';
import type { Privileges } from '../../domain/accessTokenPayload';
import type { ILoggerService } from '../../services/logger';
import { Result } from '../result';
import type { ResultType } from '../result';

export type DeleteNewUnitTemplatePricesRequestDTO = {
  courseId: number;
  countryId: number | null;
  privileges?: Privileges;
};

export type DeleteNewUnitTemplatePricesResponseDTO = void;

export class DeleteNewUnitTemplatePricesInteractor implements IInteractor<DeleteNewUnitTemplatePricesRequestDTO, DeleteNewUnitTemplatePricesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, countryId, privileges }: DeleteNewUnitTemplatePricesRequestDTO): Promise<ResultType<DeleteNewUnitTemplatePricesResponseDTO>> {
    try {
      if (!privileges?.unitPriceChange) {
        return Result.fail(new InsufficientPrivileges());
      }

      // delete the existing prices for this countryId
      await this.prisma.newUnitTemplatePrice.deleteMany({
        where: {
          newUnitTemplate: { courseId },
          countryId,
        },
      });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleteing unit template prices', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
