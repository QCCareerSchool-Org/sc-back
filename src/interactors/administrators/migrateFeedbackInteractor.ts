import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type MigrateFeedbackRequestDTO = void;
export type MigrateFeedbackResponseDTO = void;
export class MigrateFeedbackEnrollmentNotFound extends Error { }

export class MigrateFeedbackInteractor implements IInteractor<MigrateFeedbackRequestDTO, MigrateFeedbackResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<MigrateFeedbackResponseDTO>> {
    try {
      // find all upload slots that are not set to the new location
      const submissions = await this.prisma.newSubmission.findMany({
        where: { newLocation: false },
      });

      for (const submission of submissions) {
        // start a transaction
        await this.prisma.$transaction(async transaction => {
          // update the record
          const updated = await transaction.newSubmission.update({
            where: { submissionId: submission.submissionId },
            data: { newLocation: true },
            include: { enrollment: true },
          });

          // move the file
          await this.moveFile(updated.enrollment.studentId, updated.enrollment.enrollmentId, this.uuidService.binToUUID(updated.submissionId));
        });

        return Result.success(undefined); // return early for testing
      }

      return Result.success(undefined);
    } catch (err) {
      this.logger.error('error migrating feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async moveFile(studentId: number, enrollmentId: number, submissionId: string): Promise<void> {
    const paddedStudentId = studentId.toString().padStart(8, '0');
    const paddedEnrollmentId = enrollmentId.toString().padStart(8, '0');
    const oldPath = `${this.configService.config.paths.unitFeedbackPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}`;
    const newPath = `${this.configService.config.paths.unitFeedbackPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;
    if (await this.fileService.stat(`${oldPath}/${submissionId}`)) {
      await this.fileService.mkdir(newPath);
      await this.fileService.rename(`${oldPath}/${submissionId}`, `${newPath}/${submissionId}`);
    }
  }
}
