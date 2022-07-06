import type { PrismaClient } from '@prisma/client';

import type { NewMaterialDTO } from '../../domain/newMaterialDTO.js';
import { materialType } from '../../domain/newMaterialDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewMaterialRequestDTO = {
  /** uuid */
  materialId: string;
};

export type GetNewMaterialResponseDTO = NewMaterialDTO;

export class GetNewMaterialNotFound extends Error { }

export class GetNewMaterialInteractor implements IInteractor<GetNewMaterialRequestDTO, GetNewMaterialResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetNewMaterialRequestDTO): Promise<ResultType<GetNewMaterialResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      // find the material
      const material = await this.prisma.newMaterial.findUnique({
        where: { materialId: materialIdBin },
      });
      if (!material) {
        return Result.fail(new GetNewMaterialNotFound());
      }

      return Result.success({
        materialId: this.uuidService.binToUUID(material.materialId),
        materialUnitId: this.uuidService.binToUUID(material.materialUnitId),
        type: materialType(material.type),
        title: material.title,
        description: material.description,
        order: material.order,
        filename: material.filename,
        contentMimeTypeId: material.contentMimeTypeId,
        imageMimeTypeId: material.imageMimeTypeId,
        externalData: material.externalData,
        entryPoint: material.entryPoint,
        created: material.created,
        modified: material.modified,
      });

    } catch (err) {
      this.logger.error('error getting new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
