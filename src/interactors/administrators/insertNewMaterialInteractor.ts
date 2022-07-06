import type { NewMaterial, NewMaterialUnit, PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { NewMaterialDTO } from '../../domain/newMaterialDTO.js';
import { materialType } from '../../domain/newMaterialDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { IHttpService } from '../../services/http/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IMimeTypeService } from '../../services/mimeType/index.js';
import type { IUnzipService } from '../../services/unzip/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor, InteractorFileDiskUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewMaterialRequestDTO = {
  materialUnitId: string;
  title: string;
  type: 'lesson' | 'video' | 'download' | 'assignment';
  description: string;
  order: number;
  externalData: string | null;
  contentFile?: InteractorFileDiskUpload;
  imageFile?: InteractorFileDiskUpload;
  privileges?: Privileges;
};

export type InsertNewMaterialResponseDTO = NewMaterialDTO;

abstract class InsertNewMaterialError extends Error { }

export class InsertNewMaterialUnitNotFound extends InsertNewMaterialError { }
export class InsertNewMaterialIncorrectUnitType extends InsertNewMaterialError { }
export class InsertNewMaterialTitleEmpty extends InsertNewMaterialError { }
export class InsertNewMaterialTitleTooLong extends InsertNewMaterialError { }
export class InsertNewMaterialDescriptionEmpty extends InsertNewMaterialError { }
export class InsertNewMaterialDescriptionTooLong extends InsertNewMaterialError { }
export class InsertNewMaterialUnitLetterEmpty extends InsertNewMaterialError { }
export class InsertNewMaterialUnitLetterTooLong extends InsertNewMaterialError { }
export class InsertNewMaterialOrderLessThanZero extends InsertNewMaterialError { }
export class InsertNewMaterialOrderTooLarge extends InsertNewMaterialError { }
export class InsertNewMaterialInvalidType extends InsertNewMaterialError { }
export class InsertNewMaterialExternalDataPresent extends InsertNewMaterialError { }
export class InsertNewMaterialExternalDataMissing extends InsertNewMaterialError { }
export class InsertNewMaterialImageTooLarge extends InsertNewMaterialError {
  public constructor(public readonly maxSize: number, public readonly actualSize: number) { super(); }
}
export class InsertNewMaterialInvalidImageMimeType extends InsertNewMaterialError {
  public constructor(public readonly mimeType: string) { super(); }
}
export class InsertNewMaterialContentPresent extends InsertNewMaterialError { }
export class InsertNewMaterialContentMissing extends InsertNewMaterialError { }
export class InsertNewMaterialContentTooLarge extends InsertNewMaterialError {
  public constructor(public readonly maxSize: number, public readonly actualSize: number) { super(); }
}
export class InsertNewMaterialInvalidContentMimeType extends InsertNewMaterialError {
  public constructor(public readonly mimeType: string) { super(); }
}
export class InsertNewMaterialFileSaveError extends InsertNewMaterialError { }
export class InsertNewMaterialCouldNotFetchExternalData extends InsertNewMaterialError { }
export class InsertNewMaterialContentTypeMissing extends InsertNewMaterialError { }

export class InsertNewMaterialInteractor implements IInteractor<InsertNewMaterialRequestDTO, InsertNewMaterialResponseDTO> {
  public static allowedMimeTypes = [
    'application/x-zip-compressed',
    'image/jpeg',
    'image/png',
    'image/svg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly httpService: IHttpService,
    private readonly fileService: IFileService,
    private readonly unzipService: IUnzipService,
    private readonly mimeTypeService: IMimeTypeService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewMaterialRequestDTO): Promise<ResultType<InsertNewMaterialResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const materialUnitIdBin = this.uuidService.uuidToBin(request.materialUnitId);

      // find the material unit
      const materialUnit = await this.prisma.newMaterialUnit.findUnique({ where: { materialUnitId: materialUnitIdBin } });
      if (!materialUnit) {
        return Result.fail(new InsertNewMaterialUnitNotFound());
      }

      // validate the data common to all material types
      if (request.title.length === 0) {
        return Result.fail(new InsertNewMaterialTitleEmpty());
      }
      if ([ ...request.title ].length > 191) {
        return Result.fail(new InsertNewMaterialTitleTooLong());
      }

      if (request.description.length === 0) {
        return Result.fail(new InsertNewMaterialDescriptionEmpty());
      }
      if ([ ...request.description ].length > 65_536) {
        return Result.fail(new InsertNewMaterialDescriptionTooLong());
      }

      if (request.order < 0) {
        return Result.fail(new InsertNewMaterialOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new InsertNewMaterialOrderTooLarge());
      }

      if (request.imageFile) {
        if (request.imageFile.size >= this.configService.config.materialImageMaxFileSize) {
          return Result.fail(new InsertNewMaterialImageTooLarge(this.configService.config.materialImageMaxFileSize, request.imageFile.size));
        }
        if (request.imageFile.mimeType !== 'image/jpeg' && request.imageFile.mimeType !== 'image/png') {
          return Result.fail(new InsertNewMaterialInvalidImageMimeType(request.imageFile.mimeType));
        }
      }

      let material: NewMaterial;
      try {
        if (request.type === 'lesson') {
          material = await this.insertLesson(request, materialUnit);
        } else if (request.type === 'video') {
          material = await this.insertVideo(request, materialUnit);
        } else if (request.type === 'download') {
          material = await this.insertDownload(request, materialUnit);
        } else if (request.type === 'assignment') {
          material = await this.insertAssignment(request, materialUnit);
        } else {
          return Result.fail(new InsertNewMaterialInvalidType());
        }
      } catch (err) {
        if (err instanceof InsertNewMaterialError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success({
        materialId: this.uuidService.binToUUID(material.materialId),
        materialUnitId: this.uuidService.binToUUID(material.materialUnitId),
        type: materialType(material.type),
        title: material.title,
        description: material.description,
        order: material.order,
        filename: material.filename,
        contentMimeTypeId: material.contentMimeTypeId,
        imageMimeTypeId: material.imageMimeTypeId,
        externalData: material.externalData,
        entryPoint: material.entryPoint,
        created: material.created,
        modified: material.modified,
      });

    } catch (err) {
      this.logger.error('error inserting new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    } finally {
      try {
        await Promise.allSettled([
          request.contentFile ? this.fileService.unlink(request.contentFile.path) : Promise.resolve(),
          request.imageFile ? this.fileService.unlink(request.imageFile.path) : Promise.resolve(),
        ]);
      } catch (err) { /* empty */ }
    }
  }

  private async insertLesson(request: InsertNewMaterialRequestDTO, materialUnit: NewMaterialUnit): Promise<NewMaterial> {
    if (request.externalData !== null) {
      throw new InsertNewMaterialExternalDataPresent();
    }
    const contentFile = request.contentFile;
    if (!contentFile) {
      throw new InsertNewMaterialContentMissing();
    }
    if (contentFile.size >= this.configService.config.lessonArchiveMaxFileSize) {
      throw new InsertNewMaterialContentTooLarge(this.configService.config.lessonArchiveMaxFileSize, contentFile.size);
    }
    const mimeType = contentFile.mimeType === 'application/octet-stream'
      ? await this.mimeTypeService.getTypeFromFile(contentFile.path)
      : contentFile.mimeType;

    if (mimeType !== 'application/x-zip-compressed') {
      throw new InsertNewMaterialInvalidContentMimeType(mimeType);
    }

    const material = await this.prisma.$transaction(async transaction => {
      const inserted = await transaction.newMaterial.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          materialUnitId: materialUnit.materialUnitId,
          type: request.type,
          title: request.title,
          description: request.description,
          order: request.order,
          filename: null,
          contentMimeTypeId: null,
          imageMimeTypeId: request.imageFile?.mimeType ?? null,
          entryPoint: '/content',
          externalData: null,
        },
      });
      await this.extractArchive(inserted.materialId, contentFile);
      if (request.imageFile) {
        await this.saveImage(inserted.materialId, request.imageFile);
      }
      return inserted;
    });

    try {
      await this.fileService.unlink(contentFile.path);
    } catch (err) {
      this.logger.error('Unable to delete temporary file');
    }

    return material;
  }

  private async insertVideo(request: InsertNewMaterialRequestDTO, materialUnit: NewMaterialUnit): Promise<NewMaterial> {
    if (request.externalData === null) {
      throw new InsertNewMaterialExternalDataMissing();
    }
    if (request.contentFile) {
      throw new InsertNewMaterialContentPresent();
    }

    const [ contentMimeTypeId, filename ] = await this.fetchExternalData(request.externalData);

    return this.prisma.$transaction(async transaction => {
      const inserted = await transaction.newMaterial.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          materialUnitId: materialUnit.materialUnitId,
          type: request.type,
          title: request.title,
          description: request.description,
          order: request.order,
          filename,
          contentMimeTypeId,
          imageMimeTypeId: request.imageFile?.mimeType ?? null,
          externalData: request.externalData,
          entryPoint: null,
        },
      });
      if (request.imageFile) {
        await this.saveImage(inserted.materialId, request.imageFile);
      }
      return inserted;
    });
  }

  private async insertDownload(request: InsertNewMaterialRequestDTO, materialUnit: NewMaterialUnit): Promise<NewMaterial> {
    if (request.externalData !== null) {
      throw new InsertNewMaterialExternalDataPresent();
    }
    const contentFile = request.contentFile;
    if (!contentFile) {
      throw new InsertNewMaterialContentMissing();
    }
    if (contentFile.size >= this.configService.config.downloadMaxFileSize) {
      throw new InsertNewMaterialContentTooLarge(this.configService.config.downloadMaxFileSize, contentFile.size);
    }
    const contentMimeType = contentFile.mimeType === 'application/octet-stream'
      ? await this.mimeTypeService.getTypeFromFile(contentFile.path)
      : contentFile.mimeType;
    if (!InsertNewMaterialInteractor.allowedMimeTypes.includes(contentMimeType)) {
      throw new InsertNewMaterialInvalidContentMimeType(contentMimeType);
    }

    return this.prisma.$transaction(async transaction => {
      const inserted = await transaction.newMaterial.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          materialUnitId: materialUnit.materialUnitId,
          type: request.type,
          title: request.title,
          description: request.description,
          order: request.order,
          filename: contentFile.filename,
          contentMimeTypeId: contentMimeType,
          imageMimeTypeId: request.imageFile?.mimeType ?? null,
          externalData: request.externalData,
          entryPoint: null,
        },
      });
      await this.saveContent(inserted.materialId, contentFile);
      if (request.imageFile) {
        await this.saveImage(inserted.materialId, request.imageFile);
      }
      return inserted;
    });
  }

  private async insertAssignment(request: InsertNewMaterialRequestDTO, materialUnit: NewMaterialUnit): Promise<NewMaterial> {
    if (request.externalData !== null) {
      throw new InsertNewMaterialExternalDataPresent();
    }
    if (request.contentFile) {
      throw new InsertNewMaterialContentPresent();
    }

    return this.prisma.$transaction(async transaction => {
      const inserted = await transaction.newMaterial.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          materialUnitId: materialUnit.materialUnitId,
          type: request.type,
          title: request.title,
          description: request.description,
          order: request.order,
          filename: null,
          contentMimeTypeId: null,
          imageMimeTypeId: request.imageFile?.mimeType ?? null,
          externalData: null,
          entryPoint: null,
        },
      });
      if (request.imageFile) {
        await this.saveImage(inserted.materialId, request.imageFile);
      }
      return inserted;
    });
  }

  private async extractArchive(materialId: Buffer, contentFile: InteractorFileDiskUpload): Promise<void> {
    try {
      const path = `${this.configService.config.paths.materials.content}/${this.uuidService.binToUUID(materialId)}`;
      await this.fileService.mkdir(path);
      await this.unzipService.extractFiles(contentFile.path, path);
    } catch (err) {
      this.logger.error('Unable to extract material', err);
      throw new InsertNewMaterialFileSaveError();
    }
  }

  /**
   * Requests the HTTP headers from a remote resource and returns the content type and filename
   * @param externalData the URL to the external data
   * @returns the content type
   */
  private async fetchExternalData(externalData: string): Promise<[ contentType: string, filename: string ]> {
    let headers: Record<string, string>;
    try {
      headers = await this.httpService.getHeaders(externalData);
    } catch (err) {
      this.logger.warn('Couldn\'t fetch external data', err);
      throw new InsertNewMaterialCouldNotFetchExternalData();
    }

    if (typeof headers['content-type'] === 'undefined') {
      throw new InsertNewMaterialContentTypeMissing();
    }
    const contentType = headers['content-type'].split(';')[0];

    let filename = 'unknown';
    if (typeof headers['content-disposition'] !== 'undefined') {
      // get the filename from a header such as 'Content-Type: attachment; filename="foo.txt"'
      const regExp = /filename="(.*)"/iu;
      const matches = headers['content-disposition'].match(regExp);
      if (matches && matches.length >= 2) {
        filename = matches[1];
      }
    }

    return [ contentType, filename ];
  }

  private async saveContent(materialId: Buffer, contentFile: InteractorFileDiskUpload): Promise<void> {
    try {
      const basePath = `${this.configService.config.paths.materials.content}`;
      await this.fileService.mkdir(basePath);
      const path = `${basePath}/${this.uuidService.binToUUID(materialId)}`;
      await this.fileService.rename(contentFile.path, path);
    } catch (err) {
      this.logger.error('Unable to save content file', err);
      throw new InsertNewMaterialFileSaveError();
    }
  }

  private async saveImage(materialId: Buffer, imageFile: InteractorFileDiskUpload): Promise<void> {
    try {
      const basePath = `${this.configService.config.paths.materials.images}`;
      await this.fileService.mkdir(basePath);
      const path = `${basePath}/${this.uuidService.binToUUID(materialId)}`;
      await this.fileService.rename(imageFile.path, path);
    } catch (err) {
      this.logger.error('Unable to save image file', err);
      throw new InsertNewMaterialFileSaveError();
    }
  }
}
