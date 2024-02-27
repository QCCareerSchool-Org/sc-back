import type { PrismaClient } from '@prisma/client';

import type { CourseDTO } from '../../domain/courseDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetAllCoursesRequestDTO = never;

export type GetAllCoursesResponseDTO = Array<CourseDTO & { school: SchoolDTO }>;

export class GetAllCoursesInteractor implements IInteractor<GetAllCoursesRequestDTO, GetAllCoursesResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<GetAllCoursesResponseDTO>> {
    try {
      const courses = await this.prisma.course.findMany({
        orderBy: [ { schoolId: 'asc' }, { name: 'asc' } ],
        include: { school: true },
      });

      return Result.success(courses.map(c => ({
        courseId: c.courseId,
        schoolId: c.schoolId,
        variantId: c.variantId,
        code: c.code,
        version: c.version,
        studentTypeId: c.studentTypeId,
        name: c.name,
        courseGuide: c.courseGuide,
        quizzesEnabled: c.quizzesEnabled,
        noTutor: c.noTutor,
        submissionType: c.submissionType,
        enabled: c.enabled,
        order: c.order,
        submissionsEnabled: c.submissionsEnabled,
        entityVersion: c.entityVersion,
        school: {
          schoolId: c.school.schoolId,
          name: c.school.name,
          slug: c.school.slug,
          order: c.school.order,
          entityVersion: c.school.entityVersion,
        },
      })));

    } catch (err) {
      this.logger.error('error getting courses', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
