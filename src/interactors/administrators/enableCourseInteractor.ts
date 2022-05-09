import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { ILoggerService } from '../../services/logger';
import { Result } from '../result';
import type { ResultType } from '../result';

export type EnableCourseRequestDTO = {
  courseId: number;
  enable: boolean;
};

export type EnableCourseResponseDTO = CourseDTO;

export class EnableCourseNotFound extends Error { }
export class EnableCourseWrongUnitType extends Error { }

export class EnableCourseInteractor implements IInteractor<EnableCourseRequestDTO, EnableCourseResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ courseId, enable }: EnableCourseRequestDTO): Promise<ResultType<EnableCourseResponseDTO>> {
    try {
      const course = await this.prisma.course.findFirst({
        where: { courseId },
      });
      if (!course) {
        return Result.fail(new EnableCourseNotFound());
      }

      if (course.unitType !== 1) {
        return Result.fail(new EnableCourseWrongUnitType());
      }

      const updatedCourse = await this.prisma.course.update({
        where: { courseId },
        data: { newUnitsEnabled: enable },
      });

      return Result.success({
        courseId: updatedCourse.courseId,
        schoolId: updatedCourse.schoolId,
        code: updatedCourse.code,
        version: updatedCourse.version,
        studentTypeId: updatedCourse.studentTypeId,
        name: updatedCourse.name,
        courseGuide: updatedCourse.courseGuide,
        quizzesEnabled: updatedCourse.quizzesEnabled,
        noTutor: updatedCourse.noTutor,
        unitType: updatedCourse.unitType,
        enabled: updatedCourse.enabled,
        order: updatedCourse.order,
        newUnitsEnabled: updatedCourse.newUnitsEnabled,
        entityVersion: updatedCourse.entityVersion,
      });

    } catch (err) {
      this.logger.error('error updating course enabled state', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
