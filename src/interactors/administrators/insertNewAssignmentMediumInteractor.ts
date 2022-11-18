import type { NewAssignmentMedium, PrismaClient } from '@prisma/client';

import type { NewAssignmentMediumDTO, NewMediumType } from '../../domain/newAssignmentMediumDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { IHttpService } from '../../services/http/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileMemoryUpload } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewAssignmentMediumRequestDTO = {
  assignmentId: string;
  caption: string;
  order: number;
  externalData?: string;
  fileData?: InteractorFileMemoryUpload;
};

export type InsertNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO;

export class InsertNewAssignmentMediumAssignmentNotFound extends Error { }
export class InsertNewAssignmentMediumSubmissionsEnabled extends Error { }
export class InsertNewAssignmentMediumCaptionEmpty extends Error { }
export class InsertNewAssignmentMediCaptionTooLong extends Error { }
export class InsertNewAssignmentMediumOrderLessThanZero extends Error { }
export class InsertNewAssignmentMediumOrderTooLarge extends Error { }
export class InsertNewAssignmentMediumExternalDataInvalid extends Error { }
export class InsertNewAssignmentMediumDataMissing extends Error { }
export class InsertNewAssignmentMediumFileTooLarge extends Error { }
export class InsertNewAssignmentMediumInvalidMimeType extends Error { }
export class InsertNewAssignmentMediumUnacceptableMimeType extends Error { }
export class InsertNewAssignmentMediumFileSaveError extends Error { }
export class InsertNewAssignmentMediumUnableToFetchExternalData extends Error { }
export class InsertNewAssignmentMediumMissingContentType extends Error { }
export class InsertNewAssignmentMediumMissingContentLength extends Error { }
export class InsertNewAssignmentMediumInvalidContentLength extends Error { }

export class InsertNewAssignmentMediumInteractor implements IInteractor<InsertNewAssignmentMediumRequestDTO, InsertNewAssignmentMediumResponseDTO> {
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

  public async execute(request: InsertNewAssignmentMediumRequestDTO): Promise<ResultType<InsertNewAssignmentMediumResponseDTO>> {
    try {
      const { caption, order, externalData, fileData } = request;
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin },
        include: { newSubmissionTemplate: { include: { course: true } } },
      });
      if (!assignmentTemplate) {
        return Result.fail(new InsertNewAssignmentMediumAssignmentNotFound());
      }

      if (assignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new InsertNewAssignmentMediumSubmissionsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return Result.fail(new InsertNewAssignmentMediumCaptionEmpty());
      }
      if ([ ...caption ].length > 191) {
        return Result.fail(new InsertNewAssignmentMediCaptionTooLong());
      }

      if (order < 0) {
        return Result.fail(new InsertNewAssignmentMediumOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewAssignmentMediumOrderTooLarge());
      }

      if (typeof externalData !== 'undefined') {
        if (!/^https:\/\//iu.test(externalData)) {
          return Result.fail(new InsertNewAssignmentMediumExternalDataInvalid());
        }
      }

      // insert the assignment medium
      let insertedAssignmentMedium: NewAssignmentMedium;
      if (fileData) {
        insertedAssignmentMedium = await this.insertWithFile(assignmentIdBin, caption, order, fileData);
      } else if (externalData) {
        insertedAssignmentMedium = await this.insertWithExternalData(assignmentIdBin, caption, order, externalData);
      } else {
        return Result.fail(new InsertNewAssignmentMediumDataMissing());
      }

      return Result.success({
        assignmentMediumId: this.uuidService.binToUUID(insertedAssignmentMedium.assignmentMediumId),
        assignmentTemplateId: insertedAssignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(insertedAssignmentMedium.assignmentTemplateId),
        mimeTypeId: insertedAssignmentMedium.mimeTypeId,
        type: insertedAssignmentMedium.type,
        filename: insertedAssignmentMedium.filename,
        filesize: insertedAssignmentMedium.filesize,
        caption: insertedAssignmentMedium.caption,
        order: insertedAssignmentMedium.order,
        externalData: insertedAssignmentMedium.externalData,
        created: insertedAssignmentMedium.created,
        modified: insertedAssignmentMedium.modified,
      });

    } catch (err) {
      this.logger.error('error inserting assignment medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async insertWithFile(assignmentIdBin: Buffer, caption: string, order: number, fileData: InteractorFileMemoryUpload): Promise<NewAssignmentMedium> {
    if (fileData.size >= InsertNewAssignmentMediumInteractor.maxFilesize) {
      throw new InsertNewAssignmentMediumFileTooLarge(fileData.size.toString());
    }

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: fileData.mimeType } });
      if (!mimeType) {
        throw new InsertNewAssignmentMediumInvalidMimeType(fileData.mimeType);
      }

      let type: NewMediumType;
      if (mimeType.mimeTypeId.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.mimeTypeId.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.mimeTypeId.startsWith('audio/')) {
        type = 'audio';
      } else if (InsertNewAssignmentMediumInteractor.downloadMimeTypes.includes(mimeType.mimeTypeId)) {
        type = 'download';
      } else {
        throw new InsertNewAssignmentMediumUnacceptableMimeType(mimeType.mimeTypeId);
      }

      // store the data in the database
      const insertedAssignmentMedium = await transaction.newAssignmentMedium.create({
        data: {
          assignmentMediumId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          assignmentTemplateId: assignmentIdBin,
          mimeTypeId: mimeType.mimeTypeId,
          type,
          filename: fileData.filename,
          filesize: fileData.size,
          caption,
          order,
        },
      });

      // save the file
      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(insertedAssignmentMedium.assignmentMediumId)}`;
      try {
        await this.fileService.writeFile(filePath, fileData.data);
      } catch (err) {
        this.logger.error('Could not save file', err);
        throw new InsertNewAssignmentMediumFileSaveError();
      }

      return insertedAssignmentMedium;
    });
  }

  private async insertWithExternalData(assignmentIdBin: Buffer, caption: string, order: number, externalData: string): Promise<NewAssignmentMedium> {
    // check the external data
    let headers: Record<string, string | undefined>;
    try {
      headers = await this.httpService.getHeaders(externalData);
    } catch (err) {
      throw new InsertNewAssignmentMediumUnableToFetchExternalData();
    }

    if (typeof headers['content-type'] === 'undefined') {
      throw new InsertNewAssignmentMediumMissingContentType();
    }
    const contentType = headers['content-type'];

    if (typeof headers['content-length'] === 'undefined') {
      throw new InsertNewAssignmentMediumMissingContentLength();
    }
    const contentLength = parseInt(headers['content-length'], 10);
    if (isNaN(contentLength)) {
      throw new InsertNewAssignmentMediumInvalidContentLength();
    }

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: contentType } });
      if (!mimeType) {
        throw new InsertNewAssignmentMediumInvalidMimeType(contentType);
      }

      let type: NewMediumType;
      if (mimeType.mimeTypeId.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.mimeTypeId.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.mimeTypeId.startsWith('audio/')) {
        type = 'audio';
      } else if (InsertNewAssignmentMediumInteractor.downloadMimeTypes.includes(mimeType.mimeTypeId)) {
        type = 'download';
      } else {
        throw new InsertNewAssignmentMediumUnacceptableMimeType(mimeType.mimeTypeId);
      }

      // store the data in the database
      return transaction.newAssignmentMedium.create({
        data: {
          assignmentMediumId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          assignmentTemplateId: assignmentIdBin,
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
