import type { PrismaClient } from '@prisma/client';

import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetUnitRequestDTO = {
  /** uuid */
  unitId: string;
};

export type GetUnitResponseDTO = UnitDTO & {
  materials: MaterialDTO[];
};

export class GetUnitNotFound extends Error { }

export class GetUnitInteractor implements IInteractor<GetUnitRequestDTO, GetUnitResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetUnitRequestDTO): Promise<ResultType<GetUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the material
      const unit = await this.prisma.unit.findUnique({
        include: { materials: { orderBy: [ { order: 'asc' }, { materialId: 'asc' } ] } },
        where: { unitId: unitIdBin },
      });
      if (!unit) {
        return Result.fail(new GetUnitNotFound());
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        courseId: unit.courseId,
        unitLetter: unit.unitLetter,
        title: unit.title,
        order: unit.order,
        created: unit.created,
        modified: unit.modified,
        materials: unit.materials.map(m => ({
          materialId: this.uuidService.binToUUID(m.materialId),
          unitId: this.uuidService.binToUUID(m.unitId),
          type: materialType(m.type),
          title: m.title,
          description: m.description,
          order: m.order,
          filename: m.filename,
          contentMimeTypeId: m.contentMimeTypeId,
          imageMimeTypeId: m.imageMimeTypeId,
          externalData: m.externalData,
          entryPoint: m.entryPoint,
          minutes: m.minutes,
          chapters: m.chapters,
          videos: m.videos,
          knowledgeChecks: m.knowledgeChecks,
          created: m.created,
          modified: m.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
