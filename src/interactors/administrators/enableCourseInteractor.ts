import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type EnableCourseRequestDTO = {
  courseId: number;
  enable: boolean;
};

export type EnableCourseResponseDTO = CourseDTO;

export class EnableCourseNotFound extends Error { }
export class EnableCourseWrongSubmissionType extends Error { }

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
        return failure(new EnableCourseNotFound());
      }

      if (course.submissionType !== 1) {
        return failure(new EnableCourseWrongSubmissionType());
      }

      const updatedCourse = await this.prisma.course.update({
        where: { courseId },
        data: { submissionsEnabled: enable },
      });

      return success({
        courseId: updatedCourse.courseId,
        schoolId: updatedCourse.schoolId,
        variantId: updatedCourse.variantId,
        code: updatedCourse.code,
        version: updatedCourse.version,
        studentTypeId: updatedCourse.studentTypeId,
        name: updatedCourse.name,
        subheading: updatedCourse.subheading,
        courseGuide: updatedCourse.courseGuide,
        quizzesEnabled: updatedCourse.quizzesEnabled,
        noTutor: updatedCourse.noTutor,
        submissionType: updatedCourse.submissionType,
        enabled: updatedCourse.enabled,
        order: updatedCourse.order,
        submissionsEnabled: updatedCourse.submissionsEnabled,
        entityVersion: updatedCourse.entityVersion,
      });

    } catch (err) {
      this.logger.error('error updating course enabled state', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
