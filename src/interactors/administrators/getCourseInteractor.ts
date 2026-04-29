import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { CurrencyDTO } from '../../domain/currencyDTO.js';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { NewSubmissionTemplatePriceDTO } from '../../domain/newSubmissionTemplatePriceDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type GetCourseRequestDTO = {
  courseId: number;
};

export type GetCourseResponseDTO = CourseDTO & {
  school: SchoolDTO;
  newSubmissionTemplates: Array<NewSubmissionTemplateDTO & {
    prices: Array<NewSubmissionTemplatePriceDTO & {
      currency: CurrencyDTO;
    }>;
  }>;
  units: UnitDTO[];
};

export class GetCourseNotFound extends Error { }

export class GetCourseInteractor implements IInteractor<GetCourseRequestDTO, GetCourseResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId }: GetCourseRequestDTO): Promise<ResultType<GetCourseResponseDTO>> {
    try {
      const course = await this.prisma.course.findFirst({
        where: { courseId },
        include: {
          school: true,
          newSubmissionTemplates: {
            include: { prices: { include: { currency: true } } },
            orderBy: [ { order: 'asc' }, { unitLetter: 'asc' } ],
          },
          units: {
            include: { materials: { orderBy: [ { order: 'asc' }, { materialId: 'asc' } ] } },
            orderBy: [ { order: 'asc' }, { unitLetter: 'asc' } ],
          },
        },
      });
      if (!course) {
        return failure(new GetCourseNotFound());
      }

      return success({
        courseId: course.courseId,
        schoolId: course.schoolId,
        variantId: course.variantId,
        code: course.code,
        version: course.version,
        studentTypeId: course.studentTypeId,
        name: course.name,
        subheading: course.subheading,
        courseGuide: course.courseGuide,
        quizzesEnabled: course.quizzesEnabled,
        noTutor: course.noTutor,
        submissionType: course.submissionType,
        enabled: course.enabled,
        order: course.order,
        submissionsEnabled: course.submissionsEnabled,
        entityVersion: course.entityVersion,
        school: {
          schoolId: course.school.schoolId,
          name: course.school.name,
          slug: course.school.slug,
          order: course.school.order,
          entityVersion: course.school.entityVersion,
        },
        newSubmissionTemplates: course.newSubmissionTemplates.map(u => ({
          submissionTemplateId: this.uuidService.binToUUID(u.submissionTemplateId),
          courseId: u.courseId,
          unitLetter: u.unitLetter,
          title: u.title,
          description: u.description,
          markingCriteria: u.markingCriteria,
          optional: u.optional,
          order: u.order,
          created: u.created,
          modified: u.modified,
          prices: u.prices.map(p => ({
            submissionTemplatePriceId: this.uuidService.binToUUID(p.submissionTemplatePriceId),
            submissionTemplateId: this.uuidService.binToUUID(p.submissionTemplateId),
            countryId: p.countryId,
            currencyId: p.currencyId,
            price: p.price.toNumber(),
            created: p.created,
            modified: p.modified,
            currency: {
              currencyId: p.currency.currencyId,
              code: p.currency.code,
              name: p.currency.name,
              symbol: p.currency.symbol,
            },
          })),
        })),
        units: course.units.map(u => ({
          unitId: this.uuidService.binToUUID(u.unitId),
          courseId: u.courseId,
          unitLetter: u.unitLetter,
          title: u.title,
          order: u.order,
          created: u.created,
          modified: u.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting course', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
