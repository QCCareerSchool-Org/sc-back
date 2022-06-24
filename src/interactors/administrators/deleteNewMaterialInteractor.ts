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

export type DeleteNewMaterialRequestDTO = {
  materialId: string;
  privileges?: Privileges;
};

export type DeleteNewMaterialResponseDTO = void;

abstract class DeleteNewMaterialError extends Error { }

export class DeleteNewMaterialNotFound extends DeleteNewMaterialError { }

export class DeleteNewMaterialInteractor implements IInteractor<DeleteNewMaterialRequestDTO, DeleteNewMaterialResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewMaterialRequestDTO): Promise<ResultType<DeleteNewMaterialResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      // find the material
      const material = await this.prisma.newMaterial.findUnique({
        include: { newMaterialUnit: true },
        where: { materialId: materialIdBin },
      });
      if (!material) {
        return Result.fail(new DeleteNewMaterialNotFound());
      }

      // delete the record
      await this.prisma.newMaterial.delete({ where: { materialId: materialIdBin } });

      if (material.type === 'lesson') {
        const path = `${this.configService.config.paths.lessonsPath}/${material.newMaterialUnit.courseId}/${request.materialId}`;
        try {
          await this.fileService.rmdir(path);
        } catch (err) {
          this.logger.warn('Could not delete lesson', err);
        }
      } else if (material.type === 'download') {
        const path = `${this.configService.config.paths.downloadsPath}/${material.newMaterialUnit.courseId}/${request.materialId}`;
        try {
          await this.fileService.unlink(path);
        } catch (err) {
          this.logger.warn('Could not delete download', err);
        }
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
