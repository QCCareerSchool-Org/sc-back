import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetMaterialRequestDTO = {
  studentId: number;
  materialId: string;
};

export type GetMaterialResponseDTO = MaterialDTO & { complete: boolean; materialData: Record<string, string> };

export class GetMaterialNotFound extends Error { }

export class GetMaterialInteractor extends StudentInteractor<GetMaterialRequestDTO, GetMaterialResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, materialId }: GetMaterialRequestDTO): Promise<ResultType<GetMaterialResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const material = await this.prisma.material.findFirst({
        where: {
          materialId: materialIdBin,
          unit: { course: { enrollments: { some: { student: { studentId } } } } },
        },
        include: {
          materialData: { where: { enrollment: { student: { studentId } } } },
          materialCompletions: { where: { enrollment: { student: { studentId } } } },
        },
      });

      if (!material) {
        return failure(new GetMaterialNotFound());
      }

      const materialData = material.materialData.reduce<Record<string, string>>((prev, cur) => {
        prev[cur.key] = cur.value;
        return prev;
      }, {});

      const complete = material.materialCompletions.length > 0 || materialData['cmi.completion_status'] === 'completed';

      return success({
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
        complete,
        materialData,
      });

    } catch (err) {
      this.logger.error('error getting material', { studentId, materialId, err: err instanceof Error ? err.message : err });
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
