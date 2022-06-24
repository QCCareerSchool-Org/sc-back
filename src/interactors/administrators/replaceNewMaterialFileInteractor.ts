import type { NewMaterial, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { NewMaterialDTO } from '../../domain/newMaterialDTO.js';
import { materialType } from '../../domain/newMaterialDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUnzipService } from '../../services/unzip/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor, InteractorFileDiskUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type ReplaceNewMaterialFileRequestDTO = {
  /** uuid */
  materialId: string;
  fileData: InteractorFileDiskUpload;
  privileges?: Privileges;
};

export type ReplaceNewMaterialFileResponseDTO = NewMaterialDTO;

abstract class ReplaceNewMaterialFileError extends Error { }
export class ReplaceNewMaterialFileMaterialNotFound extends ReplaceNewMaterialFileError { }
export class ReplaceNewMaterialFileTooLarge extends ReplaceNewMaterialFileError { }
export class ReplaceNewMaterialFileInvalidMimeType extends ReplaceNewMaterialFileError { }
export class ReplaceNewMaterialFileSaveError extends ReplaceNewMaterialFileError { }

export class ReplaceNewMaterialFileInteractor implements IInteractor<ReplaceNewMaterialFileRequestDTO, ReplaceNewMaterialFileResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly unzipService: IUnzipService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: ReplaceNewMaterialFileRequestDTO): Promise<ResultType<ReplaceNewMaterialFileResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialIdBin = this.uuidService.uuidToBin(request.materialId);

      if (request.fileData.size >= this.configService.config.lessonArchiveMaxFileSize) {
        return Result.fail(new ReplaceNewMaterialFileTooLarge(request.fileData.size.toString()));
      }

      if (request.fileData.mimeType !== 'application/zip') {
        return Result.fail(new ReplaceNewMaterialFileInvalidMimeType());
      }

      let updatedMaterial: NewMaterial;
      try {
        updatedMaterial = await this.prisma.$transaction(async transaction => {

          const material = await transaction.newMaterial.findUnique({
            include: { newMaterialUnit: true },
            where: { materialId: materialIdBin },
          });
          if (!material) {
            throw new ReplaceNewMaterialFileMaterialNotFound();
          }

          try {
            await this.extract(material.materialId, material.newMaterialUnit.courseId, request.fileData);
          } catch (err) {
            this.logger.error('Unable to extract material', err);
            throw new ReplaceNewMaterialFileSaveError();
          }

          return material;
        });
      } catch (err) {
        if (err instanceof ReplaceNewMaterialFileError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success({
        materialId: this.uuidService.binToUUID(updatedMaterial.materialId),
        materialUnitId: this.uuidService.binToUUID(updatedMaterial.materialUnitId),
        type: materialType(updatedMaterial.type),
        title: updatedMaterial.title,
        description: updatedMaterial.description,
        order: updatedMaterial.order,
        filename: updatedMaterial.filename,
        mimeTypeId: updatedMaterial.mimeTypeId,
        externalData: updatedMaterial.externalData,
      });

    } catch (err) {
      this.logger.error('error replacing new material file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async extract(materialId: Buffer, courseId: number, fileData: InteractorFileDiskUpload): Promise<void> {
    const temporaryPath = `${this.configService.config.paths.lessonsPath}/${courseId}/${this.uuidService.createUUID()}`;
    const path = `${this.configService.config.paths.lessonsPath}/${courseId}/${this.uuidService.binToUUID(materialId)}`;
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
