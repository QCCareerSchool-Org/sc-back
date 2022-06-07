import type { NewMaterial, PrismaClient } from '@prisma/client';

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
  courseId: number;
  title: string;
  type: 'lesson' | 'video' | 'download' | 'assignment';
  description: string;
  unitLetter: string;
  order: number;
  externalData: string | null;
  fileData?: InteractorFileDiskUpload;
  privileges?: Privileges;
};

export type InsertNewMaterialResponseDTO = NewMaterialDTO;

abstract class InsertNewMaterialError extends Error { }

export class InsertNewMaterialCourseNotFound extends InsertNewMaterialError { }
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
export class InsertNewMaterialFilePresent extends InsertNewMaterialError { }
export class InsertNewMaterialFileMissing extends InsertNewMaterialError { }
export class InsertNewMaterialFileTooLarge extends InsertNewMaterialError {
  public constructor(public readonly maxSize: number, public readonly actualSize: number) { super(); }
}
export class InsertNewMaterialInvalidMimeType extends InsertNewMaterialError {
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

      // find the course
      const course = await this.prisma.course.findUnique({ where: { courseId: request.courseId } });
      if (!course) {
        return Result.fail(new InsertNewMaterialCourseNotFound());
      }

      if (course.unitType !== 1) {
        return Result.fail(new InsertNewMaterialIncorrectUnitType());
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

      if (request.unitLetter.length === 0) {
        return Result.fail(new InsertNewMaterialUnitLetterEmpty());
      }
      if ([ ...request.unitLetter ].length > 1) {
        return Result.fail(new InsertNewMaterialUnitLetterTooLong());
      }

      if (request.order < 0) {
        return Result.fail(new InsertNewMaterialOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new InsertNewMaterialOrderTooLarge());
      }

      let material: NewMaterial;
      try {
        if (request.type === 'lesson') {
          material = await this.insertLesson(request);
        } else if (request.type === 'video') {
          material = await this.insertVideo(request);
        } else if (request.type === 'download') {
          material = await this.insertDownload(request);
        } else if (request.type === 'assignment') {
          material = await this.insertAssignment(request);
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
        courseId: material.courseId,
        type: materialType(material.type),
        title: material.title,
        description: material.description,
        unitLetter: material.unitLetter,
        order: material.order,
        filename: material.filename,
        mimeTypeId: material.mimeTypeId,
        externalData: material.externalData,
      });

    } catch (err) {
      this.logger.error('error inserting new material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async insertLesson(request: InsertNewMaterialRequestDTO): Promise<NewMaterial> {
    if (request.externalData !== null) {
      throw new InsertNewMaterialExternalDataPresent();
    }
    if (!request.fileData) {
      throw new InsertNewMaterialFileMissing();
    }
    const fileData = request.fileData;
    if (request.fileData.size >= this.configService.config.lessonArchiveMaxFileSize) {
      throw new InsertNewMaterialFileTooLarge(this.configService.config.lessonArchiveMaxFileSize, request.fileData.size);
    }
    const mimeType = request.fileData.mimeType === 'application/octet-stream'
      ? await this.mimeTypeService.getTypeFromFile(request.fileData.path)
      : request.fileData.mimeType;

    if (mimeType !== 'application/x-zip-compressed') {
      throw new InsertNewMaterialInvalidMimeType(mimeType);
    }

    return this.prisma.$transaction(async transaction => {
      const material = await transaction.newMaterial.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          courseId: request.courseId,
          type: request.type,
          title: request.title,
          description: request.description,
          unitLetter: request.unitLetter,
          order: request.order,
          filename: null,
          mimeTypeId: null,
          externalData: null,
        },
      });

      await this.extractArchive(material.materialId, material.courseId, fileData);

      return material;
    });
  }

  private async insertVideo(request: InsertNewMaterialRequestDTO): Promise<NewMaterial> {
    if (request.externalData === null) {
      throw new InsertNewMaterialExternalDataMissing();
    }
    if (request.fileData) {
      throw new InsertNewMaterialFilePresent();
    }

    const mimeTypeId = await this.fetchExternalData(request.externalData);

    return this.prisma.newMaterial.create({
      data: {
        materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
        courseId: request.courseId,
        type: request.type,
        title: request.title,
        description: request.description,
        unitLetter: request.unitLetter,
        order: request.order,
        filename: null,
        mimeTypeId,
        externalData: request.externalData,
      },
    });
  }

  private async insertDownload(request: InsertNewMaterialRequestDTO): Promise<NewMaterial> {
    if (request.externalData !== null) {
      throw new InsertNewMaterialExternalDataPresent();
    }
    if (!request.fileData) {
      throw new InsertNewMaterialFileMissing();
    }
    const fileData = request.fileData;
    if (request.fileData.size >= this.configService.config.downloadMaxFileSize) {
      throw new InsertNewMaterialFileTooLarge(this.configService.config.downloadMaxFileSize, request.fileData.size);
    }
    const mimeType = request.fileData.mimeType === 'application/octet-stream'
      ? await this.mimeTypeService.getTypeFromFile(request.fileData.path)
      : request.fileData.mimeType;
    if (!InsertNewMaterialInteractor.allowedMimeTypes.includes(mimeType)) {
      throw new InsertNewMaterialInvalidMimeType(mimeType);
    }

    return this.prisma.$transaction(async transaction => {
      const material = await transaction.newMaterial.create({
        data: {
          materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          courseId: request.courseId,
          type: request.type,
          title: request.title,
          description: request.description,
          unitLetter: request.unitLetter,
          order: request.order,
          filename: fileData.filename,
          mimeTypeId: fileData.mimeType,
          externalData: request.externalData,
        },
      });

      await this.saveFile(material.materialId, material.courseId, fileData);

      return material;
    });
  }

  private async insertAssignment(request: InsertNewMaterialRequestDTO): Promise<NewMaterial> {
    if (request.externalData !== null) {
      throw new InsertNewMaterialExternalDataPresent();
    }
    if (request.fileData) {
      throw new InsertNewMaterialFilePresent();
    }

    return this.prisma.newMaterial.create({
      data: {
        materialId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
        courseId: request.courseId,
        type: request.type,
        title: request.title,
        description: request.description,
        unitLetter: request.unitLetter,
        order: request.order,
        filename: null,
        mimeTypeId: null,
        externalData: null,
      },
    });
  }

  private async extractArchive(materialId: Buffer, courseId: number, fileData: InteractorFileDiskUpload): Promise<void> {
    try {
      const path = `${this.configService.config.paths.lessonsPath}/${courseId}/${this.uuidService.binToUUID(materialId)}`;
      await this.fileService.mkdir(path);
      await this.unzipService.extractFiles(fileData.path, path);
      await this.fileService.unlink(fileData.path);
    } catch (err) {
      this.logger.error('Unable to extract material', err);
      throw new InsertNewMaterialFileSaveError();
    }
  }

  private async fetchExternalData(externalData: string): Promise<string> {
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
    return headers['content-type'];
  }

  private async saveFile(materialId: Buffer, courseId: number, fileData: InteractorFileDiskUpload): Promise<void> {
    try {
      const basePath = `${this.configService.config.paths.downloadsPath}/${courseId}`;
      await this.fileService.mkdir(basePath);
      const path = `${basePath}/${this.uuidService.binToUUID(materialId)}`;
      await this.fileService.rename(fileData.path, path);
    } catch (err) {
      this.logger.error('Unable to save material', err);
      throw new InsertNewMaterialFileSaveError();
    }
  }
}
