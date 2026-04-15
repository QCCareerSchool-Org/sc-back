import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { InteractorFileStreamDownload } from '../index.js';
import { StudentInteractor } from './studentInteractor.js';

export type DownloadNewUploadSlotRequestDTO = {
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
  startByte?: number;
  endByte?: number;
};

export type DownloadNewUploadSlotResponseDTO = InteractorFileStreamDownload;

export class DownloadNewUploadSlotNotFound extends Error { }
export class DownloadNewUploadSlotFileNotFound extends Error { }
export class DownloadNewUploadSlotFileReadError extends Error { }

export class DownloadNewUploadSlotInteractor extends StudentInteractor<DownloadNewUploadSlotRequestDTO, DownloadNewUploadSlotResponseDTO> {
  private static readonly maxAge = 300;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute(request: DownloadNewUploadSlotRequestDTO): Promise<ResultType<DownloadNewUploadSlotResponseDTO>> {
    try {
      const { studentId, courseId, startByte, endByte } = request;
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(request.uploadSlotId);

      const uploadSlot = await this.prisma.newUploadSlot.findFirst({
        where: {
          uploadSlotId: uploadSlotIdBin,
          newPart: {
            partId: partIdBin,
            newAssignment: {
              assignmentId: assignmentIdBin,
              newSubmission: {
                submissionId: submissionIdBin,
                enrollment: { studentId, courseId },
              },
            },
          },
        },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
      });

      if (!uploadSlot) {
        return failure(new DownloadNewUploadSlotNotFound());
      }

      // we can now trust all values for submissionId, assignmentId, partId, and textBoxId

      const paddedEnrollmentId = uploadSlot.newPart.newAssignment.newSubmission.enrollmentId.toString().padStart(8, '0');
      const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}/${request.uploadSlotId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        return failure(new DownloadNewUploadSlotFileNotFound(filePath));
      }

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read file ${filePath}`, err);
          throw new DownloadNewUploadSlotFileReadError(filePath);
        }

        return success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(uploadSlot.filename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: uploadSlot.mimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewUploadSlotInteractor.maxAge,
          contentEncoding: uploadSlot.compressed ? 'gzip' : undefined,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read file ${filePath}`, err);
        return failure(new DownloadNewUploadSlotFileReadError(filePath));
      }

      return success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(uploadSlot.filename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: uploadSlot.mimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewUploadSlotInteractor.maxAge,
        contentEncoding: uploadSlot.compressed ? 'gzip' : undefined,
      });

    } catch (err) {
      this.logger.error('error downloading upload slot file', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
