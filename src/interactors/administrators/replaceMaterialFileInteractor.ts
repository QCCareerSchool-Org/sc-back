import type { Material, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUnzipService } from '../../services/unzip/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor, InteractorFileDiskUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type ReplaceMaterialFileRequestDTO = {
  /** uuid */
  materialId: string;
  fileData: InteractorFileDiskUpload;
  privileges?: Privileges;
};

export type ReplaceMaterialFileResponseDTO = MaterialDTO;

abstract class ReplaceMaterialFileError extends Error { }
export class ReplaceMaterialFileMaterialNotFound extends ReplaceMaterialFileError { }
export class ReplaceMaterialFileTooLarge extends ReplaceMaterialFileError { }
export class ReplaceMaterialFileInvalidMimeType extends ReplaceMaterialFileError { }
export class ReplaceMaterialFileSaveError extends ReplaceMaterialFileError { }

export class ReplaceMaterialFileInteractor implements IInteractor<ReplaceMaterialFileRequestDTO, ReplaceMaterialFileResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly unzipService: IUnzipService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: ReplaceMaterialFileRequestDTO): Promise<ResultType<ReplaceMaterialFileResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      if (request.fileData.size >= this.configService.config.lessonArchiveMaxFileSize) {
        return Result.fail(new ReplaceMaterialFileTooLarge(request.fileData.size.toString()));
      }

      if (request.fileData.mimeType !== 'application/zip') {
        return Result.fail(new ReplaceMaterialFileInvalidMimeType());
      }

      let updatedMaterial: Material;
      try {
        updatedMaterial = await this.prisma.$transaction(async transaction => {

          const material = await transaction.material.findUnique({
            include: { unit: true },
            where: { materialId: materialIdBin },
          });
          if (!material) {
            throw new ReplaceMaterialFileMaterialNotFound();
          }

          try {
            await this.extract(material.materialId, request.fileData);
          } catch (err) {
            this.logger.error('Unable to extract material', err);
            throw new ReplaceMaterialFileSaveError();
          }

          return material;
        });
      } catch (err) {
        if (err instanceof ReplaceMaterialFileError) {
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
        complete: updatedMaterial.complete,
        created: updatedMaterial.created,
        modified: updatedMaterial.modified,
      });

    } catch (err) {
      this.logger.error('error replacing material file', err instanceof Error ? err.message : err);
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
