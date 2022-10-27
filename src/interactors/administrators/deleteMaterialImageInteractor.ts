import type { Material, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteMaterialImageRequestDTO = {
  /** uuid */
  materialId: string;
  privileges?: Privileges;
};

export type DeleteMaterialImageResponseDTO = MaterialDTO;

abstract class DeleteMaterialImageError extends Error { }
export class DeleteMaterialImageMaterialNotFound extends DeleteMaterialImageError { }
export class DeleteMaterialImageTooLarge extends DeleteMaterialImageError { }
export class DeleteMaterialImageInvalidMimeType extends DeleteMaterialImageError { }
export class DeleteMaterialImageFilesystemError extends DeleteMaterialImageError { }

export class DeleteMaterialImageInteractor implements IInteractor<DeleteMaterialImageRequestDTO, DeleteMaterialImageResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ materialId, privileges }: DeleteMaterialImageRequestDTO): Promise<ResultType<DeleteMaterialImageResponseDTO>> {
    try {
      if (!privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(materialId);

      let updatedMaterial: Material;
      try {
        updatedMaterial = await this.prisma.$transaction(async transaction => {

          const material = await transaction.material.findUnique({
            include: { unit: true },
            where: { materialId: materialIdBin },
          });
          if (!material) {
            throw new DeleteMaterialImageMaterialNotFound();
          }

          try {
            await this.deleteImage(materialId);
          } catch (err) {
            this.logger.error('Unable to delete image file', err);
            throw new DeleteMaterialImageFilesystemError();
          }

          return transaction.material.update({
            where: { materialId: materialIdBin },
            data: { imageMimeTypeId: null },
          });
        });
      } catch (err) {
        if (err instanceof DeleteMaterialImageError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success({
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
        created: updatedMaterial.created,
        modified: updatedMaterial.modified,
      });

    } catch (err) {
      this.logger.error('error deleting material image', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async deleteImage(materialId: string): Promise<void> {
    const path = `${this.configService.config.paths.materials.images}/${materialId}`;
    await this.fileService.unlink(path);
  }
}
