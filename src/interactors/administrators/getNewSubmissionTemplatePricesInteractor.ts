import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewSubmissionTemplatePriceDTO } from '../../domain/newSubmissionTemplatePriceDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type GetNewSubmissionTemplatePricesRequestDTO = {
  courseId: number;
  countryId: number | null;
};

export type GetNewSubmissionTemplatePricesResponseDTO = NewSubmissionTemplatePriceDTO[];

export class GetNewSubmissionTemplatePricesCourseNotFound extends Error { }

export class GetNewSubmissionTemplatePricesInteractor implements IInteractor<GetNewSubmissionTemplatePricesRequestDTO, GetNewSubmissionTemplatePricesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, countryId }: GetNewSubmissionTemplatePricesRequestDTO): Promise<ResultType<GetNewSubmissionTemplatePricesResponseDTO>> {
    try {

      // find the course and its submissions and their prices
      const course = await this.prisma.course.findFirst({
        where: { courseId },
        include: {
          newSubmissionTemplates: { include: { prices: true } },
        },
      });
      if (!course) {
        throw new GetNewSubmissionTemplatePricesCourseNotFound();
      }

      return success(course.newSubmissionTemplates.flatMap(u => {
        return u.prices.filter(p => p.countryId === countryId).map(p => ({
          submissionTemplatePriceId: this.uuidService.binToUUID(p.submissionTemplatePriceId),
          submissionTemplateId: this.uuidService.binToUUID(p.submissionTemplateId),
          countryId: p.countryId,
          price: p.price.toNumber(),
          currencyId: p.currencyId,
          created: this.dateService.fixPrismaReadDate(p.created),
          modified: this.dateService.fixPrismaReadDate(p.modified),
        }));
      }));

    } catch (err) {
      this.logger.error('error getting submission template prices', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
