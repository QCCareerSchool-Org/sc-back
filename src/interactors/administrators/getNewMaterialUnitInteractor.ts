import type { PrismaClient } from '@prisma/client';

import type { NewMaterialDTO } from '../../domain/newMaterialDTO.js';
import { materialType } from '../../domain/newMaterialDTO.js';
import type { NewMaterialUnitDTO } from '../../domain/newMaterialUnitDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewMaterialUnitRequestDTO = {
  /** uuid */
  materialUnitId: string;
};

export type GetNewMaterialUnitResponseDTO = NewMaterialUnitDTO & {
  newMaterials: NewMaterialDTO[];
};

export class GetNewMaterialUnitNotFound extends Error { }

export class GetNewMaterialUnitInteractor implements IInteractor<GetNewMaterialUnitRequestDTO, GetNewMaterialUnitResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetNewMaterialUnitRequestDTO): Promise<ResultType<GetNewMaterialUnitResponseDTO>> {
    try {
      const materialUnitIdBin = this.uuidService.uuidToBin(request.materialUnitId);

      // find the material
      const materialUnit = await this.prisma.newMaterialUnit.findUnique({
        include: { newMaterials: { orderBy: [ { order: 'asc' }, { materialId: 'asc' } ] } },
        where: { materialUnitId: materialUnitIdBin },
      });
      if (!materialUnit) {
        return Result.fail(new GetNewMaterialUnitNotFound());
      }

      return Result.success({
        materialUnitId: this.uuidService.binToUUID(materialUnit.materialUnitId),
        courseId: materialUnit.courseId,
        unitLetter: materialUnit.unitLetter,
        title: materialUnit.title,
        order: materialUnit.order,
        created: materialUnit.created,
        modified: materialUnit.modified,
        newMaterials: materialUnit.newMaterials.map(m => ({
          materialId: this.uuidService.binToUUID(m.materialId),
          materialUnitId: this.uuidService.binToUUID(m.materialUnitId),
          type: materialType(m.type),
          title: m.title,
          description: m.description,
          order: m.order,
          filename: m.filename,
          contentMimeTypeId: m.contentMimeTypeId,
          imageMimeTypeId: m.imageMimeTypeId,
          externalData: m.externalData,
          entryPoint: m.entryPoint,
          created: m.created,
          modified: m.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting new material unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
