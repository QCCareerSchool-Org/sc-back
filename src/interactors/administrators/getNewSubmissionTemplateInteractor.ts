import type { PrismaClient } from '@prisma/client';

import type { CountryDTO } from '../../domain/countryDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { CurrencyDTO } from '../../domain/currencyDTO.js';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { NewSubmissionTemplatePriceDTO } from '../../domain/newSubmissionTemplatePriceDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewSubmissionTemplateRequestDTO = {
  submissionId: string;
};

export type GetNewSubmissionTemplateResponseDTO = NewSubmissionTemplateDTO & {
  course: CourseDTO;
  newAssignmentTemplates: NewAssignmentTemplateDTO[];
  prices: Array<NewSubmissionTemplatePriceDTO & { country: CountryDTO | null; currency: CurrencyDTO }>;
};

export class GetNewSubmissionTemplateNotFound extends Error { }

export class GetNewSubmissionTemplateInteractor implements IInteractor<GetNewSubmissionTemplateRequestDTO, GetNewSubmissionTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionId }: GetNewSubmissionTemplateRequestDTO): Promise<ResultType<GetNewSubmissionTemplateResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      // find the submission template
      const submissionTemplate = await this.prisma.newSubmissionTemplate.findFirst({
        where: { submissionTemplateId: submissionIdBin },
        include: {
          course: true,
          newAssignmentTemplates: {
            orderBy: [ { assignmentNumber: 'asc' } ],
          },
          prices: { include: { country: true, currency: true } },
        },
      });
      if (!submissionTemplate) {
        return Result.fail(new GetNewSubmissionTemplateNotFound());
      }

      return Result.success({
        submissionTemplateId: this.uuidService.binToUUID(submissionTemplate.submissionTemplateId),
        courseId: submissionTemplate.courseId,
        unitLetter: submissionTemplate.unitLetter,
        title: submissionTemplate.title,
        description: submissionTemplate.description,
        markingCriteria: submissionTemplate.markingCriteria,
        optional: submissionTemplate.optional,
        order: submissionTemplate.order,
        created: this.dateService.fixPrismaReadDate(submissionTemplate.created),
        modified: this.dateService.fixPrismaReadDate(submissionTemplate.modified),
        course: {
          courseId: submissionTemplate.course.courseId,
          schoolId: submissionTemplate.course.schoolId,
          variantId: submissionTemplate.course.variantId,
          code: submissionTemplate.course.code,
          version: submissionTemplate.course.version,
          studentTypeId: submissionTemplate.course.studentTypeId,
          name: submissionTemplate.course.name,
          courseGuide: submissionTemplate.course.courseGuide,
          quizzesEnabled: submissionTemplate.course.quizzesEnabled,
          noTutor: submissionTemplate.course.noTutor,
          submissionType: submissionTemplate.course.submissionType,
          enabled: submissionTemplate.course.enabled,
          order: submissionTemplate.course.order,
          submissionsEnabled: submissionTemplate.course.submissionsEnabled,
          entityVersion: submissionTemplate.course.entityVersion,
        },
        newAssignmentTemplates: submissionTemplate.newAssignmentTemplates.map(a => ({
          assignmentTemplateId: this.uuidService.binToUUID(a.assignmentTemplateId),
          submissionTemplateId: this.uuidService.binToUUID(a.submissionTemplateId),
          assignmentNumber: a.assignmentNumber,
          title: a.title,
          description: a.description,
          descriptionType: a.descriptionType,
          markingCriteria: a.markingCriteria,
          optional: a.optional,
          created: this.dateService.fixPrismaReadDate(a.created),
          modified: this.dateService.fixPrismaReadDate(a.modified),
        })),
        prices: submissionTemplate.prices.map(p => ({
          submissionTemplatePriceId: this.uuidService.binToUUID(p.submissionTemplatePriceId),
          submissionTemplateId: this.uuidService.binToUUID(p.submissionTemplateId),
          countryId: p.countryId,
          price: p.price.toNumber(),
          currencyId: p.currencyId,
          created: this.dateService.fixPrismaReadDate(p.created),
          modified: this.dateService.fixPrismaReadDate(p.modified),
          country: p.country === null ? null : {
            countryId: p.country.countryId,
            name: p.country.name,
            code: p.country.code,
            entityVersion: p.country.entityVersion,
          },
          currency: {
            currencyId: p.currency.currencyId,
            code: p.currency.code,
            name: p.currency.name,
            symbol: p.currency.symbol,
          },
        })),
      });

    } catch (err) {
      this.logger.error('error getting submission template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
