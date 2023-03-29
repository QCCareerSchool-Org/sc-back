import type { MaterialCompletion, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { MaterialCompletionDTO } from '../../domain/materialCompletionDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type InsertMaterialCompletionRequestDTO = {
  studentId: number;
  enrollmentId: number;
  materialId: string;
};

export type InsertMaterialCompletionResponseDTO = MaterialCompletionDTO;

abstract class InsertMaterialCompletionError extends Error { }
export class InsertMaterialCompletionMaterialNotFound extends InsertMaterialCompletionError { }
export class InsertMaterialCompletionAlreadyExists extends InsertMaterialCompletionError { }

export class InsertMaterialCompletionInteractor implements IInteractor<InsertMaterialCompletionRequestDTO, InsertMaterialCompletionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, enrollmentId, materialId }: InsertMaterialCompletionRequestDTO): Promise<ResultType<InsertMaterialCompletionResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const material = await this.prisma.material.findFirst({
        where: { materialId: materialIdBin, unit: { course: { enrollments: { some: { enrollmentId, student: { studentId } } } } } },
      });

      if (!material) {
        return Result.fail(new InsertMaterialCompletionMaterialNotFound());
      }

      let materialCompletion: MaterialCompletion;
      try {
        materialCompletion = await this.prisma.materialCompletion.create({
          data: { enrollmentId, materialId: materialIdBin },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return Result.fail(new InsertMaterialCompletionAlreadyExists());
        }
        throw err;
      }

      return Result.success({
        materialId: this.uuidService.binToUUID(materialCompletion.materialId),
        enrollmentId: materialCompletion.enrollmentId,
      });

    } catch (err) {
      this.logger.error('error inserting material completion', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
