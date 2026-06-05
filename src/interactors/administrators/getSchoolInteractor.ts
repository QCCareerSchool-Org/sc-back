import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type GetSchoolRequestDTO = {
  schoolId: number;
};

export type GetSchoolResponseDTO = SchoolDTO & {
  courses: CourseDTO[];
};

export class GetSchoolNotFound extends Error { }

export class GetSchoolInteractor implements IInteractor<GetSchoolRequestDTO, GetSchoolResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId }: GetSchoolRequestDTO): Promise<ResultType<GetSchoolResponseDTO>> {
    try {
      const school = await this.prisma.school.findUnique({
        where: { schoolId },
        include: {
          courses: {
            orderBy: [ { code: 'asc' }, { version: 'asc' } ],
          },
        },
      });
      if (!school) {
        return failure(new GetSchoolNotFound());
      }

      return success({
        schoolId: school.schoolId,
        name: school.name,
        slug: school.slug,
        order: school.order,
        entityVersion: school.entityVersion,
        courses: school.courses.map(c => ({
          courseId: c.courseId,
          schoolId: c.schoolId,
          variantId: c.variantId,
          code: c.code,
          version: c.version,
          studentTypeId: c.studentTypeId,
          name: c.name,
          subheading: c.subheading,
          courseGuide: c.courseGuide,
          quizzesEnabled: c.quizzesEnabled,
          noTutor: c.noTutor,
          submissionType: c.submissionType,
          enabled: c.enabled,
          order: c.order,
          submissionsEnabled: c.submissionsEnabled,
          designationId: c.designationId,
          entityVersion: c.entityVersion,
        })),
      });

    } catch (err) {
      this.logger.error('error getting school', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
