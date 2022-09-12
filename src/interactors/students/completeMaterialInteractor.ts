import type { PrismaClient } from '@prisma/client';
import type { MaterialDTO } from '../../domain/materialDTO.js';

import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type CompleteMaterialRequestDTO = {
  studentId: number;
  materialId: string;
  complete: boolean;
};

export type CompleteMaterialResponseDTO = MaterialDTO;

abstract class CompleteMaterialError extends Error { }
export class CompleteMaterialNotFound extends CompleteMaterialError { }

export class CompleteMaterialInteractor implements IInteractor<CompleteMaterialRequestDTO, CompleteMaterialResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, materialId, complete }: CompleteMaterialRequestDTO): Promise<ResultType<CompleteMaterialResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const material = await this.prisma.material.findFirst({
        where: { materialId: materialIdBin, unit: { course: { enrollments: { some: { student: { studentId } } } } } },
      });

      if (!material) {
        return Result.fail(new CompleteMaterialNotFound());
      }

      const updatedMaterial = await this.prisma.material.update({
        where: { materialId: materialIdBin },
        data: { complete },
      });

      return Result.success({
        materialId: this.uuidService.binToUUID(updatedMaterial.materialId),
        unitId: this.uuidService.binToUUID(updatedMaterial.unitId),
        type: updatedMaterial.type,
        title: updatedMaterial.title,
        description: updatedMaterial.description,
        order: updatedMaterial.order,
        filename: updatedMaterial.filename,
        contentMimeTypeId: updatedMaterial.contentMimeTypeId,
        imageMimeTypeId: updatedMaterial.imageMimeTypeId,
        externalData: updatedMaterial.externalData,
        entryPoint: updatedMaterial.entryPoint,
        minutes: updatedMaterial.minutes,
        chapters: updatedMaterial.chapters,
        videos: updatedMaterial.videos,
        knowledgeChecks: updatedMaterial.knowledgeChecks,
        complete: updatedMaterial.complete,
        created: updatedMaterial.created,
        modified: updatedMaterial.modified,
      });

    } catch (err) {
      this.logger.error('error completing material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
