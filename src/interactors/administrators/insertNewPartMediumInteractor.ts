import type { NewPartMedium, PrismaClient } from '@prisma/client';

import type { NewMediumType } from '../../domain/newAssignmentMediumDTO.js';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { HeaderValue, IHttpService } from '../../services/http/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileMemoryUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewPartMediumRequestDTO = {
  partId: string;
  caption: string;
  order: number;
  externalData?: string;
  fileData?: InteractorFileMemoryUpload;
};

export type InsertNewPartMediumResponseDTO = NewPartMediumDTO;

export class InsertNewPartMediumPartNotFound extends Error { }
export class InsertNewPartMediumSubmissionsEnabled extends Error { }
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
    private readonly sanitizerService: ISanitizerService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewPartMediumRequestDTO): Promise<ResultType<InsertNewPartMediumResponseDTO>> {
    try {
      const { caption, order, externalData, fileData } = request;
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } },
      });
      if (!partTemplate) {
        return Result.fail(new InsertNewPartMediumPartNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new InsertNewPartMediumSubmissionsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return Result.fail(new InsertNewPartMediumCaptionEmpty());
      }
      if ([ ...caption ].length > 191) {
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
      if (fileData) {
        insertedPartMedium = await this.insertWithFile(partIdBin, caption, order, fileData);
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
        created: this.dateService.fixPrismaReadDate(insertedPartMedium.created),
        modified: this.dateService.fixPrismaReadDate(insertedPartMedium.modified),
      });

    } catch (err) {
      this.logger.error('error inserting part medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async insertWithFile(partIdBin: Buffer, caption: string, order: number, fileData: InteractorFileMemoryUpload): Promise<NewPartMedium> {
    if (fileData.size >= InsertNewPartMediumInteractor.maxFilesize) {
      throw new InsertNewPartMediumFileTooLarge(fileData.size.toString());
    }

    const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: fileData.mimeType } });
      if (!mimeType) {
        throw new InsertNewPartMediumInvalidMimeType(fileData.mimeType);
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
          filename: this.sanitizerService.shortenSanitizedFilename(this.sanitizerService.sanitizeFilename(fileData.filename)),
          filesize: fileData.size,
          caption,
          order,
          created: prismaNow,
          modified: prismaNow,
        },
      });

      // save the file
      const filePath = `${this.configService.config.paths.partMediaPath}/${this.uuidService.binToUUID(insertedPartMedium.partMediumId)}`;
      try {
        await this.fileService.writeFile(filePath, fileData.data);
      } catch (err) {
        this.logger.error('Could not save file', err);
        throw new InsertNewPartMediumFileSaveError();
      }

      return insertedPartMedium;
    });
  }

  private async insertWithExternalData(partIdBin: Buffer, caption: string, order: number, externalData: string): Promise<NewPartMedium> {
    // check the external data
    let headers: Record<string, HeaderValue | undefined>;
    try {
      headers = await this.httpService.getHeaders(externalData);
    } catch (err) {
      throw new InsertNewPartMediumUnableToFetchExternalData();
    }

    if (typeof headers['content-type'] !== 'string') {
      throw new InsertNewPartMediumMissingContentType();
    }
    const contentType = headers['content-type'];

    if (typeof headers['content-length'] !== 'string') {
      throw new InsertNewPartMediumMissingContentLength();
    }
    const contentLength = parseInt(headers['content-length'], 10);
    if (isNaN(contentLength)) {
      throw new InsertNewPartMediumInvalidContentLength();
    }

    const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

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

      const filename = externalData.substring(externalData.lastIndexOf('/') + 1);

      // store the data in the database
      return transaction.newPartMedium.create({
        data: {
          partMediumId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          partTemplateId: partIdBin,
          mimeTypeId: mimeType.mimeTypeId,
          type,
          filename: this.sanitizerService.shortenSanitizedFilename(this.sanitizerService.sanitizeFilename(filename)),
          filesize: contentLength,
          caption,
          order,
          externalData,
          created: prismaNow,
          modified: prismaNow,
        },
      });
    });
  }
}
