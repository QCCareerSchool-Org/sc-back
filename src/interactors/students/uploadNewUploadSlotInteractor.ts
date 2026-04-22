import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewUploadSlotDTO } from '../../domain/students/newUploadSlotDTO.js';
import type { ICompressionService } from '../../services/compression/index.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { IImageConversionService } from '../../services/imageConversion/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IMimeTypeService } from '../../services/mimeType/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { InteractorFileMemoryUpload } from '../index.js';
import { StudentInteractor } from './studentInteractor.js';

export type UploadNewUploadSlotRequestDTO = {
  studentId: number;
  courseId: number;
  /** uuid */
  submissionId: string;
  /** uuid */
  assignmentId: string;
  /** uuid */
  partId: string;
  /** uuid */
  uploadSlotId: string;
  file: InteractorFileMemoryUpload;
};

export type UploadNewUploadSlotResponseDTO = NewUploadSlotDTO;

abstract class UploadNewUploadSlotError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class UploadNewUploadSlotNotFound extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotSubmissionSubmitted extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotFileTooLarge extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotInvalidFileType extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotUnsupportedFileType extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotEntityNotFound extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotCouldNotCreateDirectory extends UploadNewUploadSlotError { }
export class UploadNewUploadSlotSaveError extends UploadNewUploadSlotError { }

/**
 * Should consider mark overrides.
 */
export class UploadNewUploadSlotInteractor extends StudentInteractor<UploadNewUploadSlotRequestDTO, UploadNewUploadSlotResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly compressionService: ICompressionService,
    private readonly sanitizerService: ISanitizerService,
    dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly mimeTypeService: IMimeTypeService,
    private readonly imageConversionService: IImageConversionService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, submissionId, assignmentId, partId, uploadSlotId, file }: UploadNewUploadSlotRequestDTO): Promise<ResultType<UploadNewUploadSlotResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: { student: true },
      });

      this.checkEnrollment(enrollment);

      const newUploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: { uploadSlotId: uploadSlotIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newSubmission: { submissionId: submissionIdBin, enrollment: { studentId, courseId } } } } },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
      });
      if (!newUploadSlot) {
        return failure(new UploadNewUploadSlotNotFound());
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.submitted) {
        return failure(new UploadNewUploadSlotSubmissionSubmitted());
      }

      if (file.size > this.configService.config.uploadSlotMaxFilesize) {
        return failure(new UploadNewUploadSlotFileTooLarge());
      }

      const realMimeType = await this.mimeTypeService.getTypeFromBuffer(file.data);
      if (realMimeType !== file.mimeType) {
        this.logger.warn(`Reported file type does not match ${realMimeType}`, { studentId, courseId, filename: file.filename, size: file.size, mimeType: file.mimeType });
      }

      let uploadData = file.data;
      let uploadMimeType = file.mimeType;
      let uploadFilename = file.filename;
      let uploadSize = file.size;
      let convertedFromMimeType: string | null = null;

      const converter = this.getImageToJpgConverter(realMimeType);
      if (converter) {
        const conversionResult = await converter(file.data);
        if (conversionResult.success) {
          uploadData = conversionResult.value;
          uploadMimeType = 'image/jpeg';
          uploadFilename = this.imageConversionService.withFileExtension(file.filename, 'jpg');
          uploadSize = uploadData.byteLength;
          convertedFromMimeType = realMimeType;
        } else {
          this.logger.error(`Unable to convert ${realMimeType}`, conversionResult.error.message);
          return failure(new UploadNewUploadSlotUnsupportedFileType());
        }
      }

      if (!this.allowedType(uploadMimeType, newUploadSlot.allowedTypes.split(','))) {
        this.logger.info('Invalid mime type', uploadMimeType);
        return failure(new UploadNewUploadSlotInvalidFileType());
      }

      const sanitizedUploadFilename = this.sanitizerService.shortenSanitizedFilename(this.sanitizerService.sanitizeFilename(uploadFilename));
      if (convertedFromMimeType) {
        this.logger.info('Converted upload slot image file', {
          studentId,
          courseId,
          uploadSlotId,
          originalFilename: file.filename,
          storedFilename: sanitizedUploadFilename,
          detectedMimeType: convertedFromMimeType,
          storedMimeType: uploadMimeType,
          originalSize: file.size,
          storedSize: uploadSize,
        });
      }

      const updatedUploadSlot = await this.prisma.$transaction(async transaction => {
        // look up the mime type
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: uploadMimeType },
        });
        if (!mimeType) {
          this.logger.error(`Could not find mime type "${uploadMimeType}"`);
          throw new UploadNewUploadSlotEntityNotFound();
        }

        const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

        const updated = await transaction.newUploadSlot.update({
          data: {
            filename: sanitizedUploadFilename,
            filesize: uploadSize,
            mimeTypeId: mimeType.mimeTypeId,
            compressed: mimeType.compress,
            modified: prismaNow,
          },
          where: { uploadSlotId: uploadSlotIdBin },
          include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
        });

        // determine the path and create it if it doesn't exist
        const paddedEnrollmentId = newUploadSlot.newPart.newAssignment.newSubmission.enrollmentId.toString().padStart(8, '0');
        const path = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;
        try {
          if (!await this.fileService.stat(path)) {
            await this.fileService.mkdir(path);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUploadSlotCouldNotCreateDirectory(path);
        }

        // save the file
        const filePath = `${path}/${uploadSlotId}`;
        try {
          if (mimeType.compress) {
            await this.fileService.writeFile(filePath, await this.compressionService.gzip(uploadData));
          } else {
            await this.fileService.writeFile(filePath, uploadData);
          }
        } catch (err) {
          this.logger.error('Could not save file', err);
          throw new UploadNewUploadSlotSaveError();
        }

        return updated;
      });

      if (convertedFromMimeType && updatedUploadSlot.filename !== sanitizedUploadFilename) {
        this.logger.warn('Converted upload slot image filename changed after update', {
          studentId,
          courseId,
          uploadSlotId,
          expectedFilename: sanitizedUploadFilename,
          updatedFilename: updatedUploadSlot.filename,
        });
      }

      return success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.newPart.newAssignment.newSubmission.closed ? updatedUploadSlot.markOverride ?? updatedUploadSlot.mark : null, // hide mark unless the submission is marked
        notes: null, // students should never see the tutor's notes
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        filename: updatedUploadSlot.filename,
        filesize: updatedUploadSlot.filesize,
        mimeTypeId: updatedUploadSlot.mimeTypeId,
        complete: updatedUploadSlot.filename !== null,
        created: this.dateService.fixPrismaReadDate(updatedUploadSlot.created),
        modified: this.dateService.fixPrismaReadDate(updatedUploadSlot.modified),
      });

    } catch (err) {
      this.logger.error('error uploading upload slot file', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private allowedType(mimeType: string, allowedTypes: string[]): boolean {
    for (const allowedType of allowedTypes) {
      if (allowedType === 'image') {
        if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/x-png' || mimeType === 'image/bmp' || mimeType === 'image/gif') {
          return true;
        }
      } else if (allowedType === 'pdf') {
        if (mimeType === 'application/pdf') {
          return true;
        }
      } else if (allowedType === 'word') {
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
          return true;
        }
      } else if (allowedType === 'excel') {
        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
          return true;
        }
      }
    }
    return false;
  }

  private isHeicMimeType(mimeType: string): boolean {
    return mimeType === 'image/heic'
      || mimeType === 'image/heif'
      || mimeType === 'image/heic-sequence'
      || mimeType === 'image/heif-sequence';
  }

  private isAvifMimeType(mimeType: string): boolean {
    return mimeType === 'image/avif';
  }

  private isWebpMimeType(mimeType: string): boolean {
    return mimeType === 'image/webp';
  }

  private getImageToJpgConverter(mimeType: string): ((buffer: Buffer) => ReturnType<IImageConversionService['heicToJpg'] | IImageConversionService['avifToJpg'] | IImageConversionService['webpToJpg']>) | null {
    if (this.isHeicMimeType(mimeType)) {
      return async buffer => this.imageConversionService.heicToJpg(buffer);
    }
    if (this.isAvifMimeType(mimeType)) {
      return async buffer => this.imageConversionService.avifToJpg(buffer);
    }
    if (this.isWebpMimeType(mimeType)) {
      return async buffer => this.imageConversionService.webpToJpg(buffer);
    }
    return null;
  }
}
