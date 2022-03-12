import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { SchoolDTO } from '../../domain/schoolDTO';
import type { ILoggerService } from '../../services/logger';
import type { ResultType } from '../result';
import { Result } from '../result';

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
        return Result.fail(new GetSchoolNotFound());
      }

      return Result.success({
        schoolId: school.schoolId,
        name: school.name,
        slug: school.slug,
        order: school.order,
        entityVersion: school.entityVersion,
        courses: school.courses.map(c => ({
          courseId: c.courseId,
          schoolId: c.schoolId,
          code: c.code,
          version: c.version,
          studentTypeId: c.studentTypeId,
          name: c.name,
          courseGuide: c.courseGuide,
          quizzesEnabled: c.quizzesEnabled,
          noTutor: c.noTutor,
          unitType: c.unitType,
          enabled: c.enabled,
          order: c.order,
          newUnitsEnabled: c.newUnitsEnabled,
          entityVersion: c.entityVersion,
        })),
      });

    } catch (err) {
      this.logger.error('error getting school', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
