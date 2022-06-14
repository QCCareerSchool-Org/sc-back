import type { PrismaClient } from '@prisma/client';

import type { CountryDTO } from '../../domain/countryDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { CurrencyDTO } from '../../domain/currencyDTO.js';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO.js';
import type { NewUnitTemplatePriceDTO } from '../../domain/newUnitTemplatePriceDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewUnitTemplateRequestDTO = {
  unitId: string;
};

export type GetNewUnitTemplateResponseDTO = NewUnitTemplateDTO & {
  course: CourseDTO;
  newAssignmentTemplates: NewAssignmentTemplateDTO[];
  prices: Array<NewUnitTemplatePriceDTO & { country: CountryDTO | null; currency: CurrencyDTO }>;
};

export class GetNewUnitTemplateNotFound extends Error { }

export class GetNewUnitTemplateInteractor implements IInteractor<GetNewUnitTemplateRequestDTO, GetNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ unitId }: GetNewUnitTemplateRequestDTO): Promise<ResultType<GetNewUnitTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      // find the unit template
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { unitTemplateId: unitIdBin },
        include: {
          course: true,
          newAssignmentTemplates: {
            orderBy: [ { assignmentNumber: 'asc' } ],
          },
          prices: { include: { country: true, currency: true } },
        },
      });
      if (!unitTemplate) {
        return Result.fail(new GetNewUnitTemplateNotFound());
      }

      return Result.success({
        unitTemplateId: this.uuidService.binToUUID(unitTemplate.unitTemplateId),
        courseId: unitTemplate.courseId,
        unitLetter: unitTemplate.unitLetter,
        title: unitTemplate.title,
        description: unitTemplate.description,
        markingCriteria: unitTemplate.markingCriteria,
        optional: unitTemplate.optional,
        order: unitTemplate.order,
        created: unitTemplate.created,
        modified: unitTemplate.modified,
        course: {
          courseId: unitTemplate.course.courseId,
          schoolId: unitTemplate.course.schoolId,
          code: unitTemplate.course.code,
          version: unitTemplate.course.version,
          studentTypeId: unitTemplate.course.studentTypeId,
          name: unitTemplate.course.name,
          courseGuide: unitTemplate.course.courseGuide,
          quizzesEnabled: unitTemplate.course.quizzesEnabled,
          noTutor: unitTemplate.course.noTutor,
          unitType: unitTemplate.course.unitType,
          enabled: unitTemplate.course.enabled,
          order: unitTemplate.course.order,
          newUnitsEnabled: unitTemplate.course.newUnitsEnabled,
          entityVersion: unitTemplate.course.entityVersion,
        },
        newAssignmentTemplates: unitTemplate.newAssignmentTemplates.map(a => ({
          assignmentTemplateId: this.uuidService.binToUUID(a.assignmentTemplateId),
          unitTemplateId: this.uuidService.binToUUID(a.unitTemplateId),
          assignmentNumber: a.assignmentNumber,
          title: a.title,
          description: a.description,
          descriptionType: a.descriptionType,
          markingCriteria: a.markingCriteria,
          optional: a.optional,
          created: a.created,
          modified: a.modified,
        })),
        prices: unitTemplate.prices.map(p => ({
          unitTemplatePriceId: this.uuidService.binToUUID(p.unitTemplatePriceId),
          unitTemplateId: this.uuidService.binToUUID(p.unitTemplateId),
          countryId: p.countryId,
          price: p.price.toNumber(),
          currencyId: p.currencyId,
          created: p.created,
          modified: p.modified,
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
      this.logger.error('error getting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
