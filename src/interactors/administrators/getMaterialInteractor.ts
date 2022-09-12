import type { PrismaClient } from '@prisma/client';

import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetMaterialRequestDTO = {
  /** uuid */
  materialId: string;
};

export type GetMaterialResponseDTO = MaterialDTO;

export class GetMaterialNotFound extends Error { }

export class GetMaterialInteractor implements IInteractor<GetMaterialRequestDTO, GetMaterialResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetMaterialRequestDTO): Promise<ResultType<GetMaterialResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      // find the material
      const material = await this.prisma.material.findUnique({
        where: { materialId: materialIdBin },
      });
      if (!material) {
        return Result.fail(new GetMaterialNotFound());
      }

      return Result.success({
        materialId: this.uuidService.binToUUID(material.materialId),
        unitId: this.uuidService.binToUUID(material.unitId),
        type: materialType(material.type),
        title: material.title,
        description: material.description,
        order: material.order,
        filename: material.filename,
        contentMimeTypeId: material.contentMimeTypeId,
        imageMimeTypeId: material.imageMimeTypeId,
        externalData: material.externalData,
        entryPoint: material.entryPoint,
        minutes: material.minutes,
        chapters: material.chapters,
        videos: material.videos,
        knowledgeChecks: material.knowledgeChecks,
        complete: material.complete,
        created: material.created,
        modified: material.modified,
      });

    } catch (err) {
      this.logger.error('error getting material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
