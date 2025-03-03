import type { Material, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUnzipService } from '../../services/unzip/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor, InteractorFileDiskUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type ReplaceMaterialContentRequestDTO = {
  /** uuid */
  materialId: string;
  fileData: InteractorFileDiskUpload;
  privileges?: Privileges;
};

export type ReplaceMaterialContentResponseDTO = MaterialDTO;

abstract class ReplaceMaterialContentError extends Error { }
export class ReplaceMaterialContentMaterialNotFound extends ReplaceMaterialContentError { }
export class ReplaceMaterialDeleteMetaDataError extends ReplaceMaterialContentError { }
export class ReplaceMaterialContentTooLarge extends ReplaceMaterialContentError { }
export class ReplaceMaterialContentInvalidMimeType extends ReplaceMaterialContentError { }
export class ReplaceMaterialContentSaveError extends ReplaceMaterialContentError { }

export class ReplaceMaterialContentInteractor implements IInteractor<ReplaceMaterialContentRequestDTO, ReplaceMaterialContentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly unzipService: IUnzipService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: ReplaceMaterialContentRequestDTO): Promise<ResultType<ReplaceMaterialContentResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      if (request.fileData.size >= this.configService.config.lessonArchiveMaxFileSize) {
        return Result.fail(new ReplaceMaterialContentTooLarge(request.fileData.size.toString()));
      }

      if (request.fileData.mimeType !== 'application/x-zip-compressed') {
        return Result.fail(new ReplaceMaterialContentInvalidMimeType());
      }

      let updatedMaterial: Material;
      try {
        updatedMaterial = await this.prisma.$transaction(async transaction => {

          const material = await transaction.material.findUnique({
            include: { unit: true },
            where: { materialId: materialIdBin },
          });
          if (!material) {
            throw new ReplaceMaterialContentMaterialNotFound();
          }

          try {
            // delte old metadata because it can sometimes cause the material to show up blank, but leave any material completions
            await transaction.materialData.deleteMany({ where: { materialId: materialIdBin } });
          } catch (err) {
            this.logger.warn('Unable to remove existing meta data', err);
            throw new ReplaceMaterialDeleteMetaDataError();
          }

          try {
            await this.extract(material.materialId, request.fileData);
          } catch (err) {
            this.logger.error('Unable to extract material', err);
            throw new ReplaceMaterialContentSaveError();
          }

          return material;
        });
      } catch (err) {
        if (err instanceof ReplaceMaterialContentError) {
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
        created: this.dateService.fixPrismaReadDate(updatedMaterial.created),
        modified: this.dateService.fixPrismaReadDate(updatedMaterial.modified),
      });

    } catch (err) {
      this.logger.error('error replacing material content', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async extract(materialId: Buffer, fileData: InteractorFileDiskUpload): Promise<void> {
    const temporaryPath = `${this.configService.config.paths.materials.content}/${this.uuidService.createUUID()}`;
    const path = `${this.configService.config.paths.materials.content}/${this.uuidService.binToUUID(materialId)}`;
    // create temporary path
    await this.fileService.mkdir(temporaryPath);
    // extract new archive to temporary path
    await this.unzipService.extractFiles(fileData.path, temporaryPath);
    // delete the old path
    await this.fileService.rmdir(path);
    // move the temporary path to the old path
    await this.fileService.rename(temporaryPath, path);
    // delete the archive
    await this.fileService.unlink(fileData.path);
  }
}
