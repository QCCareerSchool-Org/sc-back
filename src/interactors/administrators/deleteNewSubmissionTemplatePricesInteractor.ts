import type { PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { InsufficientPrivileges } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewSubmissionTemplatePricesRequestDTO = {
  courseId: number;
  countryId: number | null;
  privileges?: Privileges;
};

export type DeleteNewSubmissionTemplatePricesResponseDTO = void;

export class DeleteNewSubmissionTemplatePricesInteractor implements IInteractor<DeleteNewSubmissionTemplatePricesRequestDTO, DeleteNewSubmissionTemplatePricesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, countryId, privileges }: DeleteNewSubmissionTemplatePricesRequestDTO): Promise<ResultType<DeleteNewSubmissionTemplatePricesResponseDTO>> {
    try {
      if (!privileges?.submissionPriceChange) {
        return Result.fail(new InsufficientPrivileges());
      }

      // delete the existing prices for this countryId
      await this.prisma.newSubmissionTemplatePrice.deleteMany({
        where: {
          newSubmissionTemplate: { courseId },
          countryId,
        },
      });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleteing submission template prices', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
