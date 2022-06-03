import type { NewUnitTemplate, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

type PriceData = Array<{
  unitTemplateId: string;
  price: number;
  currencyId: number;
}>;

export type ReplaceNewUnitTemplatePricesRequestDTO = {
  courseId: number;
  countryId: number | null;
  priceData: PriceData;
  privileges?: Privileges;
};

export type ReplaceNewUnitTemplatePricesResponseDTO = void;

export class ReplaceNewUnitTemplatePricesCourseNotFound extends Error { }
export class ReplaceNewUnitTemplatePricesMissingUnits extends Error { }

export class ReplaceNewUnitTemplatePricesInteractor implements IInteractor<ReplaceNewUnitTemplatePricesRequestDTO, ReplaceNewUnitTemplatePricesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, countryId, priceData, privileges }: ReplaceNewUnitTemplatePricesRequestDTO): Promise<ResultType<ReplaceNewUnitTemplatePricesResponseDTO>> {
    try {
      if (!privileges?.unitPriceChange) {
        return Result.fail(new InsufficientPrivileges());
      }

      try {
        await this.prisma.$transaction(async transaction => {
          // find the course and its unit templates and their prices
          const course = await transaction.course.findFirst({
            where: { courseId },
            include: {
              newUnitTemplates: { include: { prices: true } },
            },
          });
          if (!course) {
            throw new ReplaceNewUnitTemplatePricesCourseNotFound();
          }

          if (!this.allUnitsProvided(course.newUnitTemplates, priceData)) {
            throw new ReplaceNewUnitTemplatePricesMissingUnits();
          }

          // delete the existing prices for this countryId
          await transaction.newUnitTemplatePrice.deleteMany({
            where: {
              unitTemplateId: { in: course.newUnitTemplates.map(u => u.unitTemplateId) },
              countryId,
            },
          });

          // create the new prices
          await transaction.newUnitTemplatePrice.createMany({
            data: priceData.map(p => ({
              unitTemplatePriceId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              unitTemplateId: this.uuidService.uuidToBin(p.unitTemplateId),
              countryId,
              price: p.price,
              currencyId: p.currencyId,
            })),
          });
        });
      } catch (err) {
        if (err instanceof Error) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error replacing unit template prices', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private allUnitsProvided(newUnitTemplates: NewUnitTemplate[], priceData: PriceData): boolean {
    for (const newUnitTemplate of newUnitTemplates) {
      if (!priceData.some(p => p.unitTemplateId === this.uuidService.binToUUID(newUnitTemplate.unitTemplateId))) {
        return false;
      }
    }
    return true;
  }
}
