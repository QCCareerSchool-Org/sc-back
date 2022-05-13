import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitTemplatePriceDTO } from '../../domain/newUnitTemplatePriceDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetNewUnitTemplatePricesRequestDTO = {
  courseId: number;
  countryId: number | null;
};

export type GetNewUnitTemplatePricesResponseDTO = NewUnitTemplatePriceDTO[];

export class GetNewUnitTemplatePricesCourseNotFound extends Error { }

export class GetNewUnitTemplatePricesInteractor implements IInteractor<GetNewUnitTemplatePricesRequestDTO, GetNewUnitTemplatePricesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, countryId }: GetNewUnitTemplatePricesRequestDTO): Promise<ResultType<GetNewUnitTemplatePricesResponseDTO>> {
    try {

      // find the course and its units and their prices
      const course = await this.prisma.course.findFirst({
        where: { courseId },
        include: {
          newUnits: { include: { prices: true } },
        },
      });
      if (!course) {
        throw new GetNewUnitTemplatePricesCourseNotFound();
      }

      return Result.success(course.newUnits.flatMap(u => {
        return u.prices.filter(p => p.countryId === countryId).map(p => ({
          unitTemplatePriceId: this.uuidService.binToUUID(p.unitTemplatePriceId),
          unitTemplateId: this.uuidService.binToUUID(p.unitTemplateId),
          countryId: p.countryId,
          price: p.price.toNumber(),
          currencyId: p.currencyId,
          created: p.created,
          modified: p.modified,
        }));
      }));

    } catch (err) {
      this.logger.error('error getting unit template prices', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
