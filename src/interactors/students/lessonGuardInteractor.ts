import type { PrismaClient } from '@prisma/client';

import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type LessonGuardRequestDTO = {
  studentId: number;
  materialId: string;
};

export type LessonGuardResponseDTO = void;

export class LessonGuardNotFound extends Error { }
export class LessonGuardNotEnrolled extends Error { }

export class LessonGuardInteractor extends StudentInteractor<LessonGuardRequestDTO, LessonGuardResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute(request: LessonGuardRequestDTO): Promise<ResultType<LessonGuardResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      const student = await this.prisma.student.findFirst({
        where: { studentId: request.studentId },
      });

      this.checkStudent(student);

      const material = await this.prisma.material.findFirst({
        where: { materialId: materialIdBin },
        include: { unit: true },
      });
      if (!material) {
        return Result.fail(new LessonGuardNotFound());
      }

      const enrollment = await this.prisma.enrollment.findUnique({
        // eslint-disable-next-line camelcase
        where: { studentId_courseId: { studentId: request.studentId, courseId: material.unit.courseId } },
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
