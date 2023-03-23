import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteAllNewSubmissionsRequestDTO = {
  enrollmentId: number;
};

export type DeleteAllNewSubmissionsResponseDTO = void;

export class DeleteAllNewSubmissionsEnrollmentNotFound extends Error { }

export class DeleteAllNewSubmissionsInteractor implements IInteractor<DeleteAllNewSubmissionsRequestDTO, DeleteAllNewSubmissionsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ enrollmentId }: DeleteAllNewSubmissionsRequestDTO): Promise<ResultType<DeleteAllNewSubmissionsResponseDTO>> {
    try {
      // find the enrollment and the submissions
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { enrollmentId },
        include: { newSubmissions: { include: { newAssignments: { include: { newParts: { include: { newUploadSlots: true } } } } } } },
      });
      if (!enrollment) {
        return Result.fail(new DeleteAllNewSubmissionsEnrollmentNotFound());
      }

      await this.prisma.newSubmission.deleteMany({ where: { enrollmentId } });

      await this.deleteAssignmentFiles(enrollmentId);

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting enrollment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async deleteAssignmentFiles(enrollmentId: number): Promise<void> {
    const paddedEnrollmentId = enrollmentId.toString().padStart(8, '0');
    const path = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;
    try {
      await this.fileService.rmdir(path);
    } catch (err) {
      this.logger.error(`Error deleting assignment directory ${path}`);
    }
  }
}
