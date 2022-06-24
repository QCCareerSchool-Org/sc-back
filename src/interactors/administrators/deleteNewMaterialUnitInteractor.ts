import type { NewMaterial, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewMaterialUnitRequestDTO = {
  materialUnitId: string;
  privileges?: Privileges;
};

export type DeleteNewMaterialUnitResponseDTO = void;

abstract class DeleteNewMaterialUnitError extends Error { }

export class DeleteNewMaterialUnitNotFound extends DeleteNewMaterialUnitError { }
export class DeleteNewMaterialUnitMaterialsPresent extends DeleteNewMaterialUnitError { }

export class DeleteNewMaterialUnitInteractor implements IInteractor<DeleteNewMaterialUnitRequestDTO, DeleteNewMaterialUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewMaterialUnitRequestDTO): Promise<ResultType<DeleteNewMaterialUnitResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialUnitIdBin = this.uuidService.uuidToBin(request.materialUnitId);

      // find the material unit
      const materialUnit = await this.prisma.newMaterialUnit.findUnique({
        include: { newMaterials: true },
        where: { materialUnitId: materialUnitIdBin },
      });
      if (!materialUnit) {
        return Result.fail(new DeleteNewMaterialUnitNotFound());
      }

      if (materialUnit.newMaterials.length) {
        return Result.fail(new DeleteNewMaterialUnitMaterialsPresent());
      }

      // delete the record
      await this.prisma.newMaterialUnit.delete({ where: { materialUnitId: materialUnitIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting new material unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
