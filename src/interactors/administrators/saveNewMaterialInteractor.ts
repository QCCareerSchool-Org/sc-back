import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import { InsufficientPrivileges } from '..';
import type { Privileges } from '../../domain/accessTokenPayload';
import type { NewMaterialDTO } from '../../domain/newMaterialDTO';
import { materialType } from '../../domain/newMaterialDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewMaterialRequestDTO = {
  /** uuid */
  materialId: string;
  courseId: number;
  title: string;
  description: string;
  unitLetter: string;
  order: number;
  privileges?: Privileges;
};

export type SaveNewMaterialResponseDTO = NewMaterialDTO;

abstract class SaveNewMaterialError extends Error { }
export class SaveNewMaterialNotFound extends SaveNewMaterialError { }
export class SaveNewMaterialTitleEmpty extends SaveNewMaterialError { }
export class SaveNewMaterialTitleTooLong extends SaveNewMaterialError { }
export class SaveNewMaterialDescriptionEmpty extends SaveNewMaterialError { }
export class SaveNewMaterialDescriptionTooLong extends SaveNewMaterialError { }
export class SaveNewMaterialUnitLetterEmpty extends SaveNewMaterialError { }
export class SaveNewMaterialUnitLetterTooLong extends SaveNewMaterialError { }
export class SaveNewMaterialOrderLessThanZero extends SaveNewMaterialError { }
export class SaveNewMaterialOrderTooLarge extends SaveNewMaterialError { }

export class SaveNewMaterialInteractor implements IInteractor<SaveNewMaterialRequestDTO, SaveNewMaterialResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewMaterialRequestDTO): Promise<ResultType<SaveNewMaterialResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      const material = await this.prisma.newMaterial.findUnique({ where: { materialId: materialIdBin } });
      if (!material) {
        return Result.fail(new SaveNewMaterialNotFound());
      }

      // validate the data
      if (request.title.length === 0) {
        return Result.fail(new SaveNewMaterialTitleEmpty());
      }
      if ([ ...request.title ].length > 191) {
        return Result.fail(new SaveNewMaterialTitleTooLong());
      }

      if (request.description.length === 0) {
        return Result.fail(new SaveNewMaterialDescriptionEmpty());
      }
      if ([ ...request.description ].length > 65_536) {
        return Result.fail(new SaveNewMaterialDescriptionTooLong());
      }

      if (request.unitLetter.length === 0) {
        return Result.fail(new SaveNewMaterialUnitLetterEmpty());
      }
      if ([ ...request.unitLetter ].length > 1) {
        return Result.fail(new SaveNewMaterialUnitLetterTooLong());
      }

      if (request.order < 0) {
        return Result.fail(new SaveNewMaterialOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new SaveNewMaterialOrderTooLarge());
      }

      const updatedMaterial = await this.prisma.newMaterial.update({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          courseId: request.courseId,
          title: request.title,
          description: request.description,
          unitLetter: request.unitLetter,
          order: request.order,
        },
        where: { materialId: materialIdBin },
      });

      return Result.success({
        materialId: this.uuidService.binToUUID(updatedMaterial.materialId),
        courseId: updatedMaterial.courseId,
        type: materialType(updatedMaterial.type),
        title: updatedMaterial.title,
        description: updatedMaterial.description,
        unitLetter: updatedMaterial.unitLetter,
        order: updatedMaterial.order,
        filename: updatedMaterial.filename,
        mimeTypeId: updatedMaterial.mimeTypeId,
        externalData: updatedMaterial.externalData,
      });

    } catch (err) {
      this.logger.error('error updating new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
