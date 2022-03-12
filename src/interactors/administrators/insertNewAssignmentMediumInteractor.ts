import type { NewAssignmentMedium, PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { IHttpService } from '../../services/http';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

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
export class InsertNewAssignmentInvalidMimeType extends Error { }
export class InsertNewAssignmentUnacceptableMimeType extends Error { }
export class InsertNewAssignmentUnacceptableFileSaveError extends Error { }
export class InsertNewAssignmentUnableToFetchExternalData extends Error { }
export class InsertNewAssignmentMissingContentType extends Error { }

export class InsertNewAssignmentMediumInteractor implements IInteractor<InsertNewAssignmentMediumRequestDTO, InsertNewAssignmentMediumResponseDTO> {

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
    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: file.mimeType } });
      if (!mimeType) {
        throw new InsertNewAssignmentInvalidMimeType();
      }

      let type: 'image' | 'video' | 'audio';
      if (mimeType.mimeTypeId.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.mimeTypeId.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.mimeTypeId.startsWith('audio/')) {
        type = 'audio';
      } else {
        throw new InsertNewAssignmentUnacceptableMimeType();
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
          order,
        },
      });

      // save the file
      const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(insertedAssignmentMedium.assignmentMediumId)}`;
      try {
        await this.fileService.writeFile(filePath, file.data);
      } catch (err) {
        this.logger.error('Could not save file', err);
        throw new InsertNewAssignmentUnacceptableFileSaveError();
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
      throw new InsertNewAssignmentUnableToFetchExternalData();
    }

    if (typeof headers['content-type'] === 'undefined') {
      throw new InsertNewAssignmentMissingContentType();
    }
    const headerMimeType = headers['content-type'];

    return this.prisma.$transaction(async transaction => {
      // look up the mime type
      const mimeType = await transaction.mimeType.findUnique({ where: { mimeTypeId: headerMimeType } });
      if (!mimeType) {
        throw new InsertNewAssignmentInvalidMimeType(headerMimeType);
      }

      let type: 'image' | 'video' | 'audio';
      if (mimeType.mimeTypeId.startsWith('image/')) {
        type = 'image';
      } else if (mimeType.mimeTypeId.startsWith('video/')) {
        type = 'video';
      } else if (mimeType.mimeTypeId.startsWith('audio/')) {
        type = 'audio';
      } else {
        throw new InsertNewAssignmentUnacceptableMimeType(headerMimeType);
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
          order,
          externalData,
        },
      });
    });
  }
}
