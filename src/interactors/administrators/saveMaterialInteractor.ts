import type { Material, PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';

export type SaveMaterialRequestDTO = {
  /** uuid */
  materialId: string;
  title: string;
  description: string;
  order: number;
  privileges?: Privileges;
  lessonMeta: {
    minutes: number;
    chapters: number;
    videos: number;
    knowledgeChecks: number;
  } | null;
};

export type SaveMaterialResponseDTO = MaterialDTO;

abstract class SaveMaterialError extends Error { }
export class SaveMaterialNotFound extends SaveMaterialError { }
export class SaveMaterialTitleEmpty extends SaveMaterialError { }
export class SaveMaterialTitleTooLong extends SaveMaterialError { }
export class SaveMaterialDescriptionEmpty extends SaveMaterialError { }
export class SaveMaterialDescriptionTooLong extends SaveMaterialError { }
export class SaveMaterialOrderLessThanZero extends SaveMaterialError { }
export class SaveMaterialOrderTooLarge extends SaveMaterialError { }
export class SaveMaterialMissingMetadata extends SaveMaterialError { }

export class SaveMaterialInteractor implements IInteractor<SaveMaterialRequestDTO, SaveMaterialResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveMaterialRequestDTO): Promise<ResultType<SaveMaterialResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return failure(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      const material = await this.prisma.material.findUnique({ where: { materialId: materialIdBin } });
      if (!material) {
        return failure(new SaveMaterialNotFound());
      }

      // validate the data
      if (request.title.length === 0) {
        return failure(new SaveMaterialTitleEmpty());
      }
      if ([ ...request.title ].length > 191) {
        return failure(new SaveMaterialTitleTooLong());
      }

      if (request.description.length === 0) {
        return failure(new SaveMaterialDescriptionEmpty());
      }
      if ([ ...request.description ].length > 65_536) {
        return failure(new SaveMaterialDescriptionTooLong());
      }

      if (request.order < 0) {
        return failure(new SaveMaterialOrderLessThanZero());
      }
      if (request.order > 127) {
        return failure(new SaveMaterialOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      let updatedMaterial: Material;

      if (material.type === 'lesson' || material.type === 'scorm2004') {
        if (!request.lessonMeta) {
          throw new SaveMaterialMissingMetadata();
        }
        updatedMaterial = await this.prisma.material.update({
          data: {
            title: request.title,
            description: request.description,
            order: request.order,
            minutes: request.lessonMeta.minutes,
            chapters: request.lessonMeta.chapters,
            videos: request.lessonMeta.videos,
            knowledgeChecks: request.lessonMeta.knowledgeChecks,
            modified: prismaNow,
          },
          where: { materialId: materialIdBin },
        });
      } else {
        updatedMaterial = await this.prisma.material.update({
          data: {
            title: request.title,
            description: request.description,
            order: request.order,
            modified: prismaNow,
          },
          where: { materialId: materialIdBin },
        });
      }

      return success({
        materialId: this.uuidService.binToUUID(updatedMaterial.materialId),
        unitId: this.uuidService.binToUUID(updatedMaterial.unitId),
        type: materialType(updatedMaterial.type),
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
        created: this.dateService.fixPrismaReadDate(updatedMaterial.created),
        modified: this.dateService.fixPrismaReadDate(updatedMaterial.modified),
      });

    } catch (err) {
      this.logger.error('error updating material', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
