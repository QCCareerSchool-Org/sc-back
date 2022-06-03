import type { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type LessonGuardRequestDTO = {
  studentId: number;
  courseId: number;
};

export type LessonGuardResponseDTO = void;

export class LessonGuardNotEnrolled extends Error { }

export class LessonGuardInteractor implements IInteractor<LessonGuardRequestDTO, LessonGuardResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: LessonGuardRequestDTO): Promise<ResultType<LessonGuardResponseDTO>> {
    try {
      const { studentId, courseId } = request;

      const enrollment = await this.prisma.enrollment.findUnique({
        // eslint-disable-next-line camelcase
        where: { studentId_courseId: { studentId, courseId } },
      });
      if (!enrollment) {
        return Result.fail(new LessonGuardNotEnrolled());
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error in lesson guard', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
