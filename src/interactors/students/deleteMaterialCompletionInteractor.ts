import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type DeleteMaterialCompletionRequestDTO = {
  studentId: number;
  enrollmentId: number;
  materialId: string;
};

export type DeleteMaterialCompletionResponseDTO = void;

abstract class DeleteMaterialCompletionError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class DeleteMaterialCompletionMaterialNotFound extends DeleteMaterialCompletionError { }
export class DeleteMaterialCompletionNotFound extends DeleteMaterialCompletionError { }

export class DeleteMaterialCompletionInteractor extends StudentInteractor<DeleteMaterialCompletionRequestDTO, DeleteMaterialCompletionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, enrollmentId, materialId }: DeleteMaterialCompletionRequestDTO): Promise<ResultType<DeleteMaterialCompletionResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const enrollment = await this.prisma.enrollment.findFirst({
        where: { enrollmentId },
        include: { student: true },
      });

      this.checkEnrollment(enrollment);

      const material = await this.prisma.material.findFirst({
        where: { materialId: materialIdBin, unit: { course: { enrollments: { some: { enrollmentId, student: { studentId } } } } } },
      });

      if (!material) {
        return failure(new DeleteMaterialCompletionMaterialNotFound());
      }

      try {
        await this.prisma.materialCompletion.delete({
          // eslint-disable-next-line camelcase
          where: { materialId_enrollmentId: { enrollmentId, materialId: materialIdBin } },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          return failure(new DeleteMaterialCompletionNotFound());
        }
        throw err;
      }

      return success(undefined);

    } catch (err) {
      this.logger.error('error deleting material completion', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
