import type { PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteMaterialRequestDTO = {
  materialId: string;
  privileges?: Privileges;
};

export type DeleteMaterialResponseDTO = void;

abstract class DeleteMaterialError extends Error { }

export class DeleteMaterialNotFound extends DeleteMaterialError { }

export class DeleteMaterialInteractor implements IInteractor<DeleteMaterialRequestDTO, DeleteMaterialResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteMaterialRequestDTO): Promise<ResultType<DeleteMaterialResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      // find the material
      const material = await this.prisma.material.findUnique({
        include: { unit: true },
        where: { materialId: materialIdBin },
      });
      if (!material) {
        return Result.fail(new DeleteMaterialNotFound());
      }

      // delete the record
      await this.prisma.material.delete({ where: { materialId: materialIdBin } });

      if (material.type === 'lesson') {
        const path = `${this.configService.config.paths.materials.content}/${request.materialId}`;
        try {
          await this.fileService.rmdir(path);
        } catch (err) {
          this.logger.warn('Could not delete content', err);
        }
      } else if (material.type === 'download') {
        const path = `${this.configService.config.paths.materials.content}/${request.materialId}`;
        try {
          await this.fileService.unlink(path);
        } catch (err) {
          this.logger.warn('Could not delete content', err);
        }
      }

      if (material.imageMimeTypeId) {
        const path = `${this.configService.config.paths.materials.images}/${request.materialId}`;
        try {
          await this.fileService.unlink(path);
        } catch (err) {
          this.logger.warn('Could not delete image', err);
        }
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
