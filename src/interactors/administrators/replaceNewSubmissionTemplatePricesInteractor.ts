import type { NewSubmissionTemplate, PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';

type PriceData = Array<{
  submissionTemplateId: string;
  price: number;
  currencyId: number;
}>;

export type ReplaceNewSubmissionTemplatePricesRequestDTO = {
  courseId: number;
  countryId: number | null;
  priceData: PriceData;
  privileges?: Privileges;
};

export type ReplaceNewSubmissionTemplatePricesResponseDTO = void;

abstract class ReplaceNewSubmissionTemplatePricesError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class ReplaceNewSubmissionTemplatePricesCourseNotFound extends ReplaceNewSubmissionTemplatePricesError { }
export class ReplaceNewSubmissionTemplatePricesMissingSubmissions extends ReplaceNewSubmissionTemplatePricesError { }

export class ReplaceNewSubmissionTemplatePricesInteractor implements IInteractor<ReplaceNewSubmissionTemplatePricesRequestDTO, ReplaceNewSubmissionTemplatePricesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, countryId, priceData, privileges }: ReplaceNewSubmissionTemplatePricesRequestDTO): Promise<ResultType<ReplaceNewSubmissionTemplatePricesResponseDTO>> {
    try {
      if (!privileges?.submissionPriceChange) {
        return failure(new InsufficientPrivileges());
      }

      try {
        await this.prisma.$transaction(async transaction => {
          // find the course and its submission templates and their prices
          const course = await transaction.course.findFirst({
            where: { courseId },
            include: {
              newSubmissionTemplates: { include: { prices: true } },
            },
          });
          if (!course) {
            throw new ReplaceNewSubmissionTemplatePricesCourseNotFound();
          }

          if (!this.allSubmissionsProvided(course.newSubmissionTemplates, priceData)) {
            throw new ReplaceNewSubmissionTemplatePricesMissingSubmissions();
          }

          // delete the existing prices for this countryId
          await transaction.newSubmissionTemplatePrice.deleteMany({
            where: {
              submissionTemplateId: { in: course.newSubmissionTemplates.map(u => u.submissionTemplateId) },
              countryId,
            },
          });

          const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

          // create the new prices
          await transaction.newSubmissionTemplatePrice.createMany({
            data: priceData.map(p => ({
              submissionTemplatePriceId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              submissionTemplateId: this.uuidService.uuidToBin(p.submissionTemplateId),
              countryId,
              price: p.price,
              currencyId: p.currencyId,
              created: prismaNow,
              modified: prismaNow,
            })),
          });
        });
      } catch (err) {
        if (err instanceof Error) {
          return failure(err);
        }
        throw err;
      }

      return success(undefined);

    } catch (err) {
      this.logger.error('error replacing submission template prices', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private allSubmissionsProvided(newSubmissionTemplates: NewSubmissionTemplate[], priceData: PriceData): boolean {
    for (const newSubmissionTemplate of newSubmissionTemplates) {
      if (!priceData.some(p => p.submissionTemplateId === this.uuidService.binToUUID(newSubmissionTemplate.submissionTemplateId))) {
        return false;
      }
    }
    return true;
  }
}
