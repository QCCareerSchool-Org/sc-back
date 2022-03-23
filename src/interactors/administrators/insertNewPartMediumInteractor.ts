import type { NewPartMedium, PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
import type { NewMediumType } from '../../domain/newAssignmentMediumDTO';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { IHttpService } from '../../services/http';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type InsertNewPartMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  data: {
    caption: string;
    order: number;
    externalData?: string;
    file?: InteractorFile;
  };
};

export type InsertNewPartMediumResponseDTO = NewPartMediumDTO;

export class InsertNewPartMediumPartNotFound extends Error { }
export class InsertNewPartMediumUnitsEnabled extends Error { }
export class InsertNewPartMediumCaptionEmpty extends Error { }
export class InsertNewPartMediumCaptionTooLong extends Error { }
export class InsertNewPartMediumOrderLessThanZero extends Error { }
export class InsertNewPartMediumOrderTooLarge extends Error { }
export class InsertNewPartMediumExternalDataInvalid extends Error { }
export class InsertNewPartMediumDataMissing extends Error { }
export class InsertNewPartMediumFileTooLarge extends Error { }
export class InsertNewPartMediumInvalidMimeType extends Error { }
export class InsertNewPartMediumUnacceptableMimeType extends Error { }
export class InsertNewPartMediumFileSaveError extends Error { }
export class InsertNewPartMediumUnableToFetchExternalData extends Error { }
export class InsertNewPartMediumMissingContentType extends Error { }
export class InsertNewPartMediumMissingContentLength extends Error { }
export class InsertNewPartMediumInvalidContentLength extends Error { }

export class InsertNewPartMediumInteractor implements IInteractor<InsertNewPartMediumRequestDTO, InsertNewPartMediumResponseDTO> {
  private static readonly maxFilesize = 33_554_432; // 32 MB
  private static readonly downloadMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly httpService: IHttpService,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewPartMediumRequestDTO): Promise<ResultType<InsertNewPartMediumResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { caption, order, externalData, file } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
        include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } },
      });
      if (!partTemplate) {
        return Result.fail(new InsertNewPartMediumPartNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new InsertNewPartMediumUnitsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return Result.fail(new InsertNewPartMediumCaptionEmpty());
      }
      if (new TextEncoder().encode(caption).length > 191) {
        return Result.fail(new InsertNewPartMediumCaptionTooLong());
      }

      if (order < 0) {
        return Result.fail(new InsertNewPartMediumOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewPartMediumOrderTooLarge());
      }

      if (typeof externalData !== 'undefined') {
        if (!/^https:\/\//iu.test(externalData)) {
          return Result.fail(new InsertNewPartMediumExternalDataInvalid());
        }
      }

      // insert the part medium
      let insertedPartMedium: NewPartMedium;
      if (file) {
        insertedPartMedium = await this.insertWithFile(partIdBin, caption, order, file);
      } else if (externalData) {
        insertedPartMedium = await this.insertWithExternalData(partIdBin, caption, order, externalData);
      } else {
        return Result.fail(new InsertNewPartMediumDataMissing());
      }

      return Result.success({
        partMediumId: this.uuidService.binToUUID(insertedPartMedium.partMediumId),
        partTemplateId: insertedPartMedium.partTemplateId === null ? null : this.uuidService.binToUUID(insertedPartMedium.partTemplateId),
        mimeTypeId: insertedPartMedium.mimeTypeId,
        type: insertedPartMedium.type,
        filename: insertedPartMedium.filename,
        filesize: insertedPartMedium.filesize,
        caption: insertedPartMedium.caption,
        order: insertedPartMedium.order,
        externalData: insertedPartMedium.externalData,
        created: insertedPartMedium.created,
        modified: insertedPartMedium.modified,
      });

    } catch (err) {
      this.logger.error('error inserting part medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async insertWithFile(partIdBin: Buffer, caption: string, order: number, file: InteractorFile): Promise<NewPartMedium> {
    if (file.size >= InsertNewPartMediumInteractor.maxFilesize) {
      throw new InsertNewPartMediumFileTooLarge(file.size.toString());
    }

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: file.mimeType } });
      if (!mimeType) {
        throw new InsertNewPartMediumInvalidMimeType(file.mimeType);
      }

      let type: NewMediumType;
      if (mimeType.mimeTypeId.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.mimeTypeId.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.mimeTypeId.startsWith('audio/')) {
        type = 'audio';
      } else if (InsertNewPartMediumInteractor.downloadMimeTypes.includes(mimeType.mimeTypeId)) {
        type = 'download';
      } else {
        throw new InsertNewPartMediumUnacceptableMimeType(mimeType.mimeTypeId);
      }

      // store the data in the database
      const insertedPartMedium = await transaction.newPartMedium.create({
        data: {
          partMediumId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          partTemplateId: partIdBin,
          mimeTypeId: mimeType.mimeTypeId,
          type,
          filename: file.filename,
          filesize: file.size,
          caption,
          order,
        },
      });

      // save the file
      const filePath = `${this.configService.config.paths.partMediaPath}/${this.uuidService.binToUUID(insertedPartMedium.partMediumId)}`;
      try {
        await this.fileService.writeFile(filePath, file.data);
      } catch (err) {
        this.logger.error('Could not save file', err);
        throw new InsertNewPartMediumFileSaveError();
      }

      return insertedPartMedium;
    });
  }

  private async insertWithExternalData(partIdBin: Buffer, caption: string, order: number, externalData: string): Promise<NewPartMedium> {
    // check the external data
    let headers: Record<string, string>;
    try {
      headers = await this.httpService.getHeaders(externalData);
    } catch (err) {
      throw new InsertNewPartMediumUnableToFetchExternalData();
    }

    if (typeof headers['content-type'] === 'undefined') {
      throw new InsertNewPartMediumMissingContentType();
    }
    const contentType = headers['content-type'];

    if (typeof headers['content-length'] === 'undefined') {
      throw new InsertNewPartMediumMissingContentLength();
    }
    const contentLength = parseInt(headers['content-length'], 10);
    if (isNaN(contentLength)) {
      throw new InsertNewPartMediumInvalidContentLength();
    }

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: contentType } });
      if (!mimeType) {
        throw new InsertNewPartMediumInvalidMimeType(contentType);
      }

      let type: NewMediumType;
      if (mimeType.mimeTypeId.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.mimeTypeId.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.mimeTypeId.startsWith('audio/')) {
        type = 'audio';
      } else if (InsertNewPartMediumInteractor.downloadMimeTypes.includes(mimeType.mimeTypeId)) {
        type = 'download';
      } else {
        throw new InsertNewPartMediumUnacceptableMimeType(mimeType.mimeTypeId);
      }

      // store the data in the database
      return transaction.newPartMedium.create({
        data: {
          partMediumId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          partTemplateId: partIdBin,
          mimeTypeId: mimeType.mimeTypeId,
          type,
          filename: externalData.substring(externalData.lastIndexOf('/') + 1),
          filesize: contentLength,
          caption,
          order,
          externalData,
        },
      });
    });
  }
}
