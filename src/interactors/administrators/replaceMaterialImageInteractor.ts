import type { Material, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor, InteractorFileDiskUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type ReplaceMaterialImageRequestDTO = {
  /** uuid */
  materialId: string;
  fileData: InteractorFileDiskUpload;
  privileges?: Privileges;
};

export type ReplaceMaterialImageResponseDTO = MaterialDTO;

abstract class ReplaceMaterialImageError extends Error { }
export class ReplaceMaterialImageMaterialNotFound extends ReplaceMaterialImageError { }
export class ReplaceMaterialImageTooLarge extends ReplaceMaterialImageError { }
export class ReplaceMaterialImageInvalidMimeType extends ReplaceMaterialImageError { }
export class ReplaceMaterialImageSaveError extends ReplaceMaterialImageError { }

export class ReplaceMaterialImageInteractor implements IInteractor<ReplaceMaterialImageRequestDTO, ReplaceMaterialImageResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ materialId, fileData, privileges }: ReplaceMaterialImageRequestDTO): Promise<ResultType<ReplaceMaterialImageResponseDTO>> {
    try {
      if (!privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(materialId);

      if (fileData.size >= this.configService.config.materialImageMaxFileSize) {
        return Result.fail(new ReplaceMaterialImageTooLarge(fileData.size.toString()));
      }

      if (!this.isValidMimeType(fileData.mimeType)) {
        return Result.fail(new ReplaceMaterialImageInvalidMimeType());
      }

      let updatedMaterial: Material;
      try {
        updatedMaterial = await this.prisma.$transaction(async transaction => {

          const material = await transaction.material.findUnique({
            include: { unit: true },
            where: { materialId: materialIdBin },
          });
          if (!material) {
            throw new ReplaceMaterialImageMaterialNotFound();
          }

          const mimeType = await transaction.mimeType.findUnique({
            where: { mimeTypeId: fileData.mimeType },
          });
          if (!mimeType) {
            throw new ReplaceMaterialImageInvalidMimeType();
          }

          try {
            await this.replaceImage(materialId, fileData);
          } catch (err) {
            this.logger.error('Unable to save image file', err);
            throw new ReplaceMaterialImageSaveError();
          }

          return transaction.material.update({
            where: { materialId: materialIdBin },
            data: { imageMimeTypeId: mimeType.mimeTypeId },
          });
        });
      } catch (err) {
        if (err instanceof ReplaceMaterialImageError) {
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
      this.logger.error('error replacing material image', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    } finally {
      try {
        await this.fileService.unlink(fileData.path);
      } catch {
        this.logger.warn('Couldn\'t delete temporary file.');
      }
    }
  }

  private isValidMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private async replaceImage(materialId: string, image: InteractorFileDiskUpload): Promise<void> {
    const path = `${this.configService.config.paths.materials.images}/${materialId}`;
    await this.fileService.copy(image.path, path);
  }
}
