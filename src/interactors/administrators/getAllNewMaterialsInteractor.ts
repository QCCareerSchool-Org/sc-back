import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewMaterialDTO } from '../../domain/newMaterialDTO';
import { materialType } from '../../domain/newMaterialDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetAllNewMaterialsRequestDTO = {
  courseId: number;
};

export type GetAllNewMaterialsResponseDTO = NewMaterialDTO[];

export class GetAllNewMaterialsInteractor implements IInteractor<GetAllNewMaterialsRequestDTO, GetAllNewMaterialsResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetAllNewMaterialsRequestDTO): Promise<ResultType<GetAllNewMaterialsResponseDTO>> {
    try {
      // find the materials
      const materials = await this.prisma.newMaterial.findMany({
        where: { courseId: request.courseId },
        orderBy: [
          { unitLetter: 'asc' },
          { order: 'asc' },
        ],
      });

      return Result.success(materials.map(l => ({
        materialId: this.uuidService.binToUUID(l.materialId),
        courseId: l.courseId,
        type: materialType(l.type),
        title: l.title,
        description: l.description,
        unitLetter: l.unitLetter,
        order: l.order,
        filename: l.filename,
        mimeTypeId: l.mimeTypeId,
        externalData: l.externalData,
      })));

    } catch (err) {
      this.logger.error('error getting new materials', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
