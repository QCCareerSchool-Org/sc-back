import type { NewAssignmentMedium, PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
import type { NewAssignmentMediumDTO, NewMediumType } from '../../domain/newAssignmentMediumDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { IHttpService } from '../../services/http';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type InsertNewAssignmentMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  data: {
    caption: string;
    order: number;
    externalData?: string;
    file?: InteractorFile;
  };
};

export type InsertNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO;

export class InsertNewAssignmentMediumAssignmentNotFound extends Error { }
export class InsertNewAssignmentMediumUnitsEnabled extends Error { }
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
      const { schoolId, courseId } = request;
      const { caption, order, externalData, file } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } },
        include: { newUnitTemplate: { include: { course: true } } },
      });
      if (!assignmentTemplate) {
        return Result.fail(new InsertNewAssignmentMediumAssignmentNotFound());
      }

      if (assignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new InsertNewAssignmentMediumUnitsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return Result.fail(new InsertNewAssignmentMediumCaptionEmpty());
      }
      if (new TextEncoder().encode(caption).length > 191) {
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
      if (file) {
        insertedAssignmentMedium = await this.insertWithFile(assignmentIdBin, caption, order, file);
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
        caption: insertedAssignmentMedium.caption,
        size: insertedAssignmentMedium.size,
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

  private async insertWithFile(assignmentIdBin: Buffer, caption: string, order: number, file: InteractorFile): Promise<NewAssignmentMedium> {
    if (file.size >= InsertNewAssignmentMediumInteractor.maxFilesize) {
      throw new InsertNewAssignmentMediumFileTooLarge(file.size.toString());
    }

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: file.mimeType } });
      if (!mimeType) {
        throw new InsertNewAssignmentMediumInvalidMimeType(file.mimeType);
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
          filename: file.filename,
          caption,
          size: file.size,
          order,
        },
      });

      // save the file
      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(insertedAssignmentMedium.assignmentMediumId)}`;
      try {
        await this.fileService.writeFile(filePath, file.data);
      } catch (err) {
        this.logger.error('Could not save file', err);
        throw new InsertNewAssignmentMediumFileSaveError();
      }

      return insertedAssignmentMedium;
    });
  }

  private async insertWithExternalData(assignmentIdBin: Buffer, caption: string, order: number, externalData: string): Promise<NewAssignmentMedium> {
    // check the external data
    let headers: Record<string, string>;
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
          caption,
          size: contentLength,
          order,
          externalData,
        },
      });
    });
  }
}
