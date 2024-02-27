import type { PrismaClient } from '@prisma/client';

import type { CourseDTO } from '../../domain/courseDTO.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetMaterialRequestDTO = {
  /** uuid */
  materialId: string;
};

export type GetMaterialResponseDTO = MaterialDTO & {
  unit: UnitDTO & {
    course: CourseDTO;
  };
};

export class GetMaterialNotFound extends Error { }

export class GetMaterialInteractor implements IInteractor<GetMaterialRequestDTO, GetMaterialResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetMaterialRequestDTO): Promise<ResultType<GetMaterialResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      // find the material
      const material = await this.prisma.material.findUnique({
        where: { materialId: materialIdBin },
        include: { unit: { include: { course: true } } },
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
        created: this.dateService.fixPrismaReadDate(material.created),
        modified: this.dateService.fixPrismaReadDate(material.modified),
        unit: {
          unitId: this.uuidService.binToUUID(material.unit.unitId),
          courseId: material.unit.courseId,
          unitLetter: material.unit.unitLetter,
          title: material.unit.title,
          order: material.unit.order,
          created: this.dateService.fixPrismaReadDate(material.unit.created),
          modified: this.dateService.fixPrismaReadDate(material.unit.modified),
          course: {
            courseId: material.unit.course.courseId,
            schoolId: material.unit.course.schoolId,
            variantId: material.unit.course.variantId,
            code: material.unit.course.code,
            version: material.unit.course.version,
            studentTypeId: material.unit.course.studentTypeId,
            name: material.unit.course.name,
            courseGuide: material.unit.course.courseGuide,
            quizzesEnabled: material.unit.course.quizzesEnabled,
            noTutor: material.unit.course.noTutor,
            submissionType: material.unit.course.submissionType,
            enabled: material.unit.course.enabled,
            order: material.unit.course.order,
            submissionsEnabled: material.unit.course.submissionsEnabled,
            entityVersion: material.unit.course.entityVersion,
          },
        },
      });

    } catch (err) {
      this.logger.error('error getting material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
