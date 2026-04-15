import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';

export type DeleteUnitRequestDTO = {
  unitId: string;
  privileges?: Privileges;
};

export type DeleteUnitResponseDTO = void;

abstract class DeleteUnitError extends Error { }

export class DeleteUnitNotFound extends DeleteUnitError { }
export class DeleteUnitMaterialsPresent extends DeleteUnitError { }

export class DeleteUnitInteractor implements IInteractor<DeleteUnitRequestDTO, DeleteUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteUnitRequestDTO): Promise<ResultType<DeleteUnitResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return failure(new InsufficientPrivileges());
      }

      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the material unit
      const unit = await this.prisma.unit.findUnique({
        include: { materials: true },
        where: { unitId: unitIdBin },
      });
      if (!unit) {
        return failure(new DeleteUnitNotFound());
      }

      if (unit.materials.length) {
        return failure(new DeleteUnitMaterialsPresent());
      }

      // delete the record
      await this.prisma.unit.delete({ where: { unitId: unitIdBin } });

      return success(undefined);

    } catch (err) {
      this.logger.error('error deleting unit', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
