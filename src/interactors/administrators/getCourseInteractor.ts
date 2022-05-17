import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { CurrencyDTO } from '../../domain/currencyDTO';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { NewUnitTemplatePriceDTO } from '../../domain/newUnitTemplatePriceDTO';
import type { SchoolDTO } from '../../domain/schoolDTO';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetCourseRequestDTO = {
  courseId: number;
};

export type GetCourseResponseDTO = CourseDTO & {
  school: SchoolDTO;
  newUnitTemplates: Array<NewUnitTemplateDTO & {
    prices: Array<NewUnitTemplatePriceDTO & {
      currency: CurrencyDTO;
    }>;
  }>;
};

export class GetCourseNotFound extends Error { }

export class GetCourseInteractor implements IInteractor<GetCourseRequestDTO, GetCourseResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId }: GetCourseRequestDTO): Promise<ResultType<GetCourseResponseDTO>> {
    try {
      const course = await this.prisma.course.findFirst({
        where: { courseId },
        include: {
          school: true,
          newUnitTemplates: {
            include: { prices: { include: { currency: true } } },
            orderBy: [ { order: 'asc' }, { unitLetter: 'asc' } ],
          },
        },
      });
      if (!course) {
        return Result.fail(new GetCourseNotFound());
      }

      return Result.success({
        courseId: course.courseId,
        schoolId: course.schoolId,
        code: course.code,
        version: course.version,
        studentTypeId: course.studentTypeId,
        name: course.name,
        courseGuide: course.courseGuide,
        quizzesEnabled: course.quizzesEnabled,
        noTutor: course.noTutor,
        unitType: course.unitType,
        enabled: course.enabled,
        order: course.order,
        newUnitsEnabled: course.newUnitsEnabled,
        entityVersion: course.entityVersion,
        school: {
          schoolId: course.school.schoolId,
          name: course.school.name,
          slug: course.school.slug,
          order: course.school.order,
          entityVersion: course.school.entityVersion,
        },
        newUnitTemplates: course.newUnitTemplates.map(u => ({
          unitTemplateId: this.uuidService.binToUUID(u.unitTemplateId),
          courseId: u.courseId,
          unitLetter: u.unitLetter,
          title: u.title,
          description: u.description,
          markingCriteria: u.markingCriteria,
          optional: u.optional,
          order: u.order,
          created: this.dateService.mapDateFromStorage(u.created),
          modified: this.dateService.mapDateFromStorage(u.modified),
          prices: u.prices.map(p => ({
            unitTemplatePriceId: this.uuidService.binToUUID(p.unitTemplatePriceId),
            unitTemplateId: this.uuidService.binToUUID(p.unitTemplateId),
            countryId: p.countryId,
            currencyId: p.currencyId,
            price: p.price.toNumber(),
            created: this.dateService.mapDateFromStorage(p.created),
            modified: this.dateService.mapDateFromStorage(p.modified),
            currency: {
              currencyId: p.currency.currencyId,
              code: p.currency.code,
              name: p.currency.name,
              symbol: p.currency.symbol,
            },
          })),
        })),
      });

    } catch (err) {
      this.logger.error('error getting course', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
