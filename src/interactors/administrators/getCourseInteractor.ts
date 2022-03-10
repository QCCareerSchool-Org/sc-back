import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { SchoolDTO } from '../../domain/schoolDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetCourseRequestDTO = {
  schoolId: number;
  courseId: number;
};

export type GetCourseResponseDTO = CourseDTO & {
  school: SchoolDTO;
  newUnitTemplates: NewUnitTemplateDTO[];
};

export class GetCourseNotFound extends Error { }

export class GetCourseInteractor implements IInteractor<GetCourseRequestDTO, GetCourseResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId }: GetCourseRequestDTO): Promise<ResultType<GetCourseResponseDTO>> {
    try {
      const course = await this.prisma.course.findFirst({
        where: { schoolId, courseId },
        include: {
          school: true,
          newUnits: {
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
        newUnitTemplates: course.newUnits.map(u => ({
          unitTemplateId: this.uuidService.binToUUID(u.unitTemplateId),
          courseId: u.courseId,
          unitLetter: u.unitLetter,
          title: u.title,
          description: u.description,
          optional: u.optional,
          order: u.order,
          enabled: u.enabled,
          created: u.created,
          modified: u.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting course', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
