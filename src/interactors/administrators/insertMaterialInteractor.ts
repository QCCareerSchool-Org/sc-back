import type { Material, PrismaClient, Unit } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import { materialType } from '../../domain/materialDTO.js';
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

export type InsertMaterialRequestDTO = {
  unitId: string;
  title: string;
  type: 'lesson' | 'video' | 'download' | 'assignment';
  description: string;
  order: number;
  externalData: string | null;
  contentFile?: InteractorFileDiskUpload;
  imageFile?: InteractorFileDiskUpload;
  privileges?: Privileges;
  lessonMeta: {
    minutes: number;
    chapters: number;
    videos: number;
    knowledgeChecks: number;
  } | null;
};

export type InsertMaterialResponseDTO = MaterialDTO;

abstract class InsertMaterialError extends Error { }

export class InsertMaterialSubmissionNotFound extends InsertMaterialError { }
export class InsertMaterialIncorrectSubmissionType extends InsertMaterialError { }
export class InsertMaterialTitleEmpty extends InsertMaterialError { }
export class InsertMaterialTitleTooLong extends InsertMaterialError { }
export class InsertMaterialDescriptionEmpty extends InsertMaterialError { }
export class InsertMaterialDescriptionTooLong extends InsertMaterialError { }
export class InsertMaterialSubmissionLetterEmpty extends InsertMaterialError { }
export class InsertMaterialSubmissionLetterTooLong extends InsertMaterialError { }
export class InsertMaterialOrderLessThanZero extends InsertMaterialError { }
export class InsertMaterialOrderTooLarge extends InsertMaterialError { }
export class InsertMaterialInvalidType extends InsertMaterialError { }
export class InsertMaterialExternalDataPresent extends InsertMaterialError { }
export class InsertMaterialExternalDataMissing extends InsertMaterialError { }
export class InsertMaterialImageTooLarge extends InsertMaterialError {
  public constructor(public readonly maxSize: number, public readonly actualSize: number) { super(); }
}
export class InsertMaterialInvalidImageMimeType extends InsertMaterialError {
  public constructor(public readonly mimeType: string) { super(); }
}
export class InsertMaterialContentPresent extends InsertMaterialError { }
export class InsertMaterialContentMissing extends InsertMaterialError { }
export class InsertMaterialContentTooLarge extends InsertMaterialError {
  public constructor(public readonly maxSize: number, public readonly actualSize: number) { super(); }
}
export class InsertMaterialInvalidContentMimeType extends InsertMaterialError {
  public constructor(public readonly mimeType: string) { super(); }
}
export class InsertMaterialMissingMetadata extends InsertMaterialError { }
export class InsertMaterialFileSaveError extends InsertMaterialError { }
export class InsertMaterialCouldNotFetchExternalData extends InsertMaterialError { }
export class InsertMaterialContentTypeMissing extends InsertMaterialError { }

export class InsertMaterialInteractor implements IInteractor<InsertMaterialRequestDTO, InsertMaterialResponseDTO> {
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

  public async execute(request: InsertMaterialRequestDTO): Promise<ResultType<InsertMaterialResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the material submission
      const unit = await this.prisma.unit.findUnique({ where: { unitId: unitIdBin } });
      if (!unit) {
        return Result.fail(new InsertMaterialSubmissionNotFound());
      }

      // validate the data common to all material types
      if (request.title.length === 0) {
        return Result.fail(new InsertMaterialTitleEmpty());
      }
      if ([ ...request.title ].length > 191) {
        return Result.fail(new InsertMaterialTitleTooLong());
      }

      if (request.description.length === 0) {
        return Result.fail(new InsertMaterialDescriptionEmpty());
      }
      if ([ ...request.description ].length > 65_536) {
        return Result.fail(new InsertMaterialDescriptionTooLong());
      }

      if (request.order < 0) {
        return Result.fail(new InsertMaterialOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new InsertMaterialOrderTooLarge());
      }

      if (request.imageFile) {
        if (request.imageFile.size >= this.configService.config.materialImageMaxFileSize) {
          return Result.fail(new InsertMaterialImageTooLarge(this.configService.config.materialImageMaxFileSize, request.imageFile.size));
        }
        if (request.imageFile.mimeType !== 'image/jpeg' && request.imageFile.mimeType !== 'image/png') {
          return Result.fail(new InsertMaterialInvalidImageMimeType(request.imageFile.mimeType));
        }
      }

      let material: Material;
      try {
        if (request.type === 'lesson') {
          material = await this.insertLesson(request, unit);
        } else if (request.type === 'video') {
          material = await this.insertVideo(request, unit);
        } else if (request.type === 'download') {
          material = await this.insertDownload(request, unit);
        } else if (request.type === 'assignment') {
          material = await this.insertAssignment(request, unit);
        } else {
          return Result.fail(new InsertMaterialInvalidType());
        }
      } catch (err) {
        if (err instanceof InsertMaterialError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success({
        materialId: this.uuidService.binToUUID(material.materialId),
        unitId: this.uuidService.binToUUID(material.unitId),
        type: materialType(material.type),
        title: material.title,
        description: material.description,
        order: material.order,
        filename: material.filename,
        contentMimeTypeId: material.contentMimeTypeId,
        imageMimeTypeId: material.imageMimeTypeId,
        externalData: material.externalData,
        entryPoint: material.entryPoint,
        minutes: material.minutes,
        chapters: material.chapters,
        videos: material.videos,
        knowledgeChecks: material.knowledgeChecks,
        created: material.created,
        modified: material.modified,
      });

    } catch (err) {
      this.logger.error('error inserting material', err instanceof Error ? err.message : err);
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

  private async insertLesson(request: InsertMaterialRequestDTO, unit: Unit): Promise<Material> {
    if (request.externalData !== null) {
      throw new InsertMaterialExternalDataPresent();
    }
    const contentFile = request.contentFile;
    if (!contentFile) {
      throw new InsertMaterialContentMissing();
    }
    if (contentFile.size >= this.configService.config.lessonArchiveMaxFileSize) {
      throw new InsertMaterialContentTooLarge(this.configService.config.lessonArchiveMaxFileSize, contentFile.size);
    }
    const mimeType = contentFile.mimeType === 'application/octet-stream'
      ? await this.mimeTypeService.getTypeFromFile(contentFile.path)
      : contentFile.mimeType;

    if (mimeType !== 'application/x-zip-compressed') {
      throw new InsertMaterialInvalidContentMimeType(mimeType);
    }

    if (!request.lessonMeta) {
      throw new InsertMaterialMissingMetadata();
    }
    const lessonMeta = request.lessonMeta;

    const material = await this.prisma.$transaction(async transaction => {
      const inserted = await transaction.material.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          unitId: unit.unitId,
          type: request.type,
          title: request.title,
          description: request.description,
          order: request.order,
          filename: null,
          contentMimeTypeId: null,
          imageMimeTypeId: request.imageFile?.mimeType ?? null,
          entryPoint: '/content',
          externalData: null,
          minutes: lessonMeta.minutes,
          chapters: lessonMeta.chapters,
          videos: lessonMeta.videos,
          knowledgeChecks: lessonMeta.knowledgeChecks,
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

  private async insertVideo(request: InsertMaterialRequestDTO, unit: Unit): Promise<Material> {
    if (request.externalData === null) {
      throw new InsertMaterialExternalDataMissing();
    }
    if (request.contentFile) {
      throw new InsertMaterialContentPresent();
    }

    const [ contentMimeTypeId, filename ] = await this.fetchExternalData(request.externalData);

    return this.prisma.$transaction(async transaction => {
      const inserted = await transaction.material.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          unitId: unit.unitId,
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

  private async insertDownload(request: InsertMaterialRequestDTO, unit: Unit): Promise<Material> {
    if (request.externalData !== null) {
      throw new InsertMaterialExternalDataPresent();
    }
    const contentFile = request.contentFile;
    if (!contentFile) {
      throw new InsertMaterialContentMissing();
    }
    if (contentFile.size >= this.configService.config.downloadMaxFileSize) {
      throw new InsertMaterialContentTooLarge(this.configService.config.downloadMaxFileSize, contentFile.size);
    }
    const contentMimeType = contentFile.mimeType === 'application/octet-stream'
      ? await this.mimeTypeService.getTypeFromFile(contentFile.path)
      : contentFile.mimeType;
    if (!InsertMaterialInteractor.allowedMimeTypes.includes(contentMimeType)) {
      throw new InsertMaterialInvalidContentMimeType(contentMimeType);
    }

    return this.prisma.$transaction(async transaction => {
      const inserted = await transaction.material.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          unitId: unit.unitId,
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

  private async insertAssignment(request: InsertMaterialRequestDTO, unit: Unit): Promise<Material> {
    if (request.externalData !== null) {
      throw new InsertMaterialExternalDataPresent();
    }
    if (request.contentFile) {
      throw new InsertMaterialContentPresent();
    }

    return this.prisma.$transaction(async transaction => {
      const inserted = await transaction.material.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          unitId: unit.unitId,
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
      throw new InsertMaterialFileSaveError();
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
      throw new InsertMaterialCouldNotFetchExternalData();
    }

    if (typeof headers['content-type'] === 'undefined') {
      throw new InsertMaterialContentTypeMissing();
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
      await this.fileService.copy(contentFile.path, path);
      await this.fileService.unlink(contentFile.path);
    } catch (err) {
      this.logger.error('Unable to save content file', err);
      throw new InsertMaterialFileSaveError();
    }
  }

  private async saveImage(materialId: Buffer, imageFile: InteractorFileDiskUpload): Promise<void> {
    try {
      const basePath = `${this.configService.config.paths.materials.images}`;
      await this.fileService.mkdir(basePath);
      const path = `${basePath}/${this.uuidService.binToUUID(materialId)}`;
      await this.fileService.copy(imageFile.path, path);
      await this.fileService.unlink(imageFile.path);
    } catch (err) {
      this.logger.error('Unable to save image file', err);
      throw new InsertMaterialFileSaveError();
    }
  }
}
