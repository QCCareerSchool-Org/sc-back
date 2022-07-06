import type { PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { NewMaterialUnitDTO } from '../../domain/newMaterialUnitDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type SaveNewMaterialUnitRequestDTO = {
  /** uuid */
  materialUnitId: string;
  title: string | null;
  order: number;
  privileges?: Privileges;
};

export type SaveNewMaterialUnitResponseDTO = NewMaterialUnitDTO;

abstract class SaveNewMaterialUnitError extends Error { }
export class SaveNewMaterialUnitNotFound extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitTitleEmpty extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitTitleTooLong extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitDescriptionEmpty extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitDescriptionTooLong extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitUnitLetterEmpty extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitUnitLetterTooLong extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitOrderLessThanZero extends SaveNewMaterialUnitError { }
export class SaveNewMaterialUnitOrderTooLarge extends SaveNewMaterialUnitError { }

export class SaveNewMaterialUnitInteractor implements IInteractor<SaveNewMaterialUnitRequestDTO, SaveNewMaterialUnitResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewMaterialUnitRequestDTO): Promise<ResultType<SaveNewMaterialUnitResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialUnitIdBin = this.uuidService.uuidToBin(request.materialUnitId);

      const materialUnit = await this.prisma.newMaterialUnit.findUnique({ where: { materialUnitId: materialUnitIdBin } });
      if (!materialUnit) {
        return Result.fail(new SaveNewMaterialUnitNotFound());
      }

      // validate the data
      if (request.title !== null) {
        if (request.title.length === 0) {
          return Result.fail(new SaveNewMaterialUnitTitleEmpty());
        }
        if ([ ...request.title ].length > 191) {
          return Result.fail(new SaveNewMaterialUnitTitleTooLong());
        }
      }

      if (request.order < 0) {
        return Result.fail(new SaveNewMaterialUnitOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new SaveNewMaterialUnitOrderTooLarge());
      }

      const updatedMaterialUnit = await this.prisma.newMaterialUnit.update({
        data: {
          title: request.title,
          order: request.order,
        },
        where: { materialUnitId: materialUnitIdBin },
      });

      return Result.success({
        materialUnitId: this.uuidService.binToUUID(updatedMaterialUnit.materialUnitId),
        courseId: updatedMaterialUnit.courseId,
        unitLetter: updatedMaterialUnit.unitLetter,
        title: updatedMaterialUnit.title,
        order: updatedMaterialUnit.order,
        created: updatedMaterialUnit.created,
        modified: updatedMaterialUnit.modified,
      });

    } catch (err) {
      this.logger.error('error updating new material unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
