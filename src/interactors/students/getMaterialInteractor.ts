import type { PrismaClient } from '@prisma/client';

import type { MaterialDTO } from '../../domain/materialDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type GetMaterialRequestDTO = {
  studentId: number;
  materialId: string;
};

export type GetMaterialResponseDTO = MaterialDTO & { materialData: Record<string, string> };

export class GetMaterialNotFound extends Error { }

export class GetMaterialInteractor implements IInteractor<GetMaterialRequestDTO, GetMaterialResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, materialId }: GetMaterialRequestDTO): Promise<ResultType<GetMaterialResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const material = await this.prisma.material.findFirst({
        where: {
          materialId: materialIdBin,
          unit: { course: { enrollments: { some: { student: { studentId } } } } },
        },
        include: { materialData: { where: { enrollment: { student: { studentId } } } } },
      });

      if (!material) {
        return Result.fail(new GetMaterialNotFound());
      }

      const materialData = material.materialData.reduce<Record<string, string>>((prev, cur) => {
        prev[cur.key] = cur.value;
        return prev;
      }, {});

      return Result.success({
        materialId: this.uuidService.binToUUID(material.materialId),
        unitId: this.uuidService.binToUUID(material.unitId),
        type: material.type,
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
        created: this.dateService.fixPrismaReadDate(material.created),
        modified: this.dateService.fixPrismaReadDate(material.modified),
        materialData,
      });

    } catch (err) {
      this.logger.error('error getting material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
