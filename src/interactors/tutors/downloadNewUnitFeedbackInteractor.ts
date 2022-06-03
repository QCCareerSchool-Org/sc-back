import type { ReadStream } from 'fs';
import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { ISanitizerService } from '../../services/sanitizer/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor, InteractorFileStreamDownload } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type DownloadNewUnitFeedbackRequestDTO = {
  tutorId: number;
  studentId: number;
  unitId: string;
  startByte?: number;
  endByte?: number;
};

export type DownloadNewUnitFeedbackResponseDTO = InteractorFileStreamDownload;

export class DownloadNewUnitFeedbackNotFound extends Error { }
export class DownloadNewUnitFeedbackUnitNotSubmitted extends Error { }
export class DownloadNewUnitFeedbackUnitSkipped extends Error { }
export class DownloadNewUnitFeedbackWrongTutor extends Error { }
export class DownloadNewUnitFeedbackFileNotFound extends Error { }
export class DownloadNewUnitFeedbackFileReadError extends Error { }

export class DownloadNewUnitFeedbackInteractor implements IInteractor<DownloadNewUnitFeedbackRequestDTO, DownloadNewUnitFeedbackResponseDTO> {
  private static readonly maxAge = 300; // five minutes in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly sanitizerService: ISanitizerService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId, startByte, endByte }: DownloadNewUnitFeedbackRequestDTO): Promise<ResultType<DownloadNewUnitFeedbackResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const newUnit = await this.prisma.newUnit.findFirst({
        where: {
          unitId: unitIdBin,
          enrollment: { studentId },
        },
      });

      if (!newUnit) {
        return Result.fail(new DownloadNewUnitFeedbackNotFound());
      }

      if (!newUnit.submitted) {
        return Result.fail(new DownloadNewUnitFeedbackUnitNotSubmitted());
      }

      if (newUnit.skipped) {
        return Result.fail(new DownloadNewUnitFeedbackUnitSkipped());
      }

      if (newUnit.tutorId !== tutorId) {
        return Result.fail(new DownloadNewUnitFeedbackWrongTutor());
      }

      const paddedStudentId = studentId.toString().padStart(8, '0');
      const filePath = `${this.configService.config.paths.unitFeedbackPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${unitId}`;

      // check if the file exists
      const stats = await this.fileService.stat(filePath);
      if (!stats) {
        this.logger.error(`Could not find feedback file ${filePath}`);
        return Result.fail(new DownloadNewUnitFeedbackFileNotFound(filePath));
      }

      if (typeof startByte !== 'undefined') {
        const start = startByte;
        const end = typeof endByte !== 'undefined' && endByte < stats.size ? endByte : stats.size - 1;

        // read the file
        let fileStream: ReadStream;
        try {
          fileStream = this.fileService.createReadStream(filePath, { start, end });
        } catch (err) {
          this.logger.error(`Could not read feedback file ${filePath}`, err);
          throw new DownloadNewUnitFeedbackFileReadError(filePath);
        }

        return Result.success({
          stream: fileStream,
          filename: this.sanitizerService.sanitizeFilename(newUnit.responseFilename ?? 'unknown'),
          size: stats.size,
          lastModified: stats.lastModified,
          mimeType: newUnit.responseMimeTypeId ?? 'application/octet-stream',
          maxAge: DownloadNewUnitFeedbackInteractor.maxAge,
          byteRange: { start, end },
        });
      }

      // read the file
      let fileStream: ReadStream;
      try {
        fileStream = this.fileService.createReadStream(filePath);
      } catch (err) {
        this.logger.error(`Could not read feedback file ${filePath}`, err);
        throw new DownloadNewUnitFeedbackFileReadError();
      }

      return Result.success({
        stream: fileStream,
        filename: this.sanitizerService.sanitizeFilename(newUnit.responseFilename ?? 'unknown'),
        size: stats.size,
        lastModified: stats.lastModified,
        mimeType: newUnit.responseMimeTypeId ?? 'application/octet-stream',
        maxAge: DownloadNewUnitFeedbackInteractor.maxAge,
      });

    } catch (err) {
      this.logger.error('error downloading new unit feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
