import type { PrismaClient } from '@prisma/client';

import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewUploadSlotDTO } from '../../domain/students/newUploadSlotDTO.js';
import type { ICompressionService } from '../../services/compression/index.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileMemoryUpload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

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

export class UploadNewUploadSlotNotFound extends Error { }
export class UploadNewUploadSlotSubmissionSubmitted extends Error { }
export class UploadNewUploadSlotFileTooLarge extends Error { }
export class UploadNewUploadSlotInvalidFileType extends Error { }
export class UploadNewUploadSlotEntityNotFound extends Error { }
export class UploadNewUploadSlotCouldNotCreateDirectory extends Error { }
export class UploadNewUploadSlotSaveError extends Error { }

/**
 * Should consider mark overrides.
 */
export class UploadNewUploadSlotInteractor implements IInteractor<UploadNewUploadSlotRequestDTO, UploadNewUploadSlotResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly compressionService: ICompressionService,
    private readonly sanitizerService: ISanitizerService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, submissionId, assignmentId, partId, uploadSlotId, file }: UploadNewUploadSlotRequestDTO): Promise<ResultType<UploadNewUploadSlotResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      const newUploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: { uploadSlotId: uploadSlotIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newSubmission: { submissionId: submissionIdBin, enrollment: { studentId, courseId } } } } },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
      });
      if (!newUploadSlot) {
        return Result.fail(new UploadNewUploadSlotNotFound());
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.submitted) {
        return Result.fail(new UploadNewUploadSlotSubmissionSubmitted());
      }

      if (file.size > this.configService.config.uploadSlotMaxFilesize) {
        return Result.fail(new UploadNewUploadSlotFileTooLarge());
      }

      if (!this.allowedType(file.mimeType, newUploadSlot.allowedTypes.split(','))) {
        return Result.fail(new UploadNewUploadSlotInvalidFileType());
      }

      const updatedUploadSlot = await this.prisma.$transaction(async transaction => {
        // look up the mime type
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: file.mimeType },
        });
        if (!mimeType) {
          this.logger.error(`Could not find mime type "${file.mimeType}"`);
          throw new UploadNewUploadSlotEntityNotFound();
        }

        const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

        const updated = await transaction.newUploadSlot.update({
          data: {
            filename: this.sanitizerService.shortenSanitizedFilename(this.sanitizerService.sanitizeFilename(file.filename)),
            filesize: file.size,
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
            await this.fileService.writeFile(filePath, await this.compressionService.gzip(file.data));
          } else {
            await this.fileService.writeFile(filePath, file.data);
          }
        } catch (err) {
          this.logger.error('Could not save file', err);
          throw new UploadNewUploadSlotSaveError();
        }

        return updated;
      });

      return Result.success({
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
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
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
}
