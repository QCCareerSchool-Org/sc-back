import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type DeleteMaterialCompletionRequestDTO = {
  studentId: number;
  enrollmentId: number;
  materialId: string;
};

export type DeleteMaterialCompletionResponseDTO = void;

abstract class DeleteMaterialCompletionError extends Error { }
export class DeleteMaterialCompletionMaterialNotFound extends DeleteMaterialCompletionError { }
export class DeleteMaterialCompletionNotFound extends DeleteMaterialCompletionError { }

export class DeleteMaterialCompletionInteractor implements IInteractor<DeleteMaterialCompletionRequestDTO, DeleteMaterialCompletionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, enrollmentId, materialId }: DeleteMaterialCompletionRequestDTO): Promise<ResultType<DeleteMaterialCompletionResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const material = await this.prisma.material.findFirst({
        where: { materialId: materialIdBin, unit: { course: { enrollments: { some: { enrollmentId, student: { studentId } } } } } },
      });

      if (!material) {
        return Result.fail(new DeleteMaterialCompletionMaterialNotFound());
      }

      try {
        await this.prisma.materialCompletion.delete({
          // eslint-disable-next-line camelcase
          where: { materialId_enrollmentId: { enrollmentId, materialId: materialIdBin } },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          return Result.fail(new DeleteMaterialCompletionNotFound());
        }
        throw err;
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting material completion', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
