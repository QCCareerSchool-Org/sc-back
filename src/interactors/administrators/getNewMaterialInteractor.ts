import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewMaterialDTO } from '../../domain/newMaterialDTO';
import { materialType } from '../../domain/newMaterialDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

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
        courseId: material.courseId,
        type: materialType(material.type),
        title: material.title,
        description: material.description,
        unitLetter: material.unitLetter,
        order: material.order,
        filename: material.filename,
        mimeTypeId: material.mimeTypeId,
        externalData: material.externalData,
      });

    } catch (err) {
      this.logger.error('error getting new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
