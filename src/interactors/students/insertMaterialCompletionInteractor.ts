import type { MaterialCompletion, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { MaterialCompletionDTO } from '../../domain/materialCompletionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type InsertMaterialCompletionRequestDTO = {
  studentId: number;
  enrollmentId: number;
  materialId: string;
};

export type InsertMaterialCompletionResponseDTO = MaterialCompletionDTO;

abstract class InsertMaterialCompletionError extends Error { }
export class InsertMaterialCompletionMaterialNotFound extends InsertMaterialCompletionError { }
export class InsertMaterialCompletionAlreadyExists extends InsertMaterialCompletionError { }

export class InsertMaterialCompletionInteractor extends StudentInteractor<InsertMaterialCompletionRequestDTO, InsertMaterialCompletionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, enrollmentId, materialId }: InsertMaterialCompletionRequestDTO): Promise<ResultType<InsertMaterialCompletionResponseDTO>> {
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
        return failure(new InsertMaterialCompletionMaterialNotFound());
      }

      let materialCompletion: MaterialCompletion;
      try {
        materialCompletion = await this.prisma.materialCompletion.create({
          data: { enrollmentId, materialId: materialIdBin },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return failure(new InsertMaterialCompletionAlreadyExists());
        }
        throw err;
      }

      return success({
        materialId: this.uuidService.binToUUID(materialCompletion.materialId),
        enrollmentId: materialCompletion.enrollmentId,
      });

    } catch (err) {
      this.logger.error('error inserting material completion', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
