import type { PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { InsufficientPrivileges } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteAllNewSubmissionsRequestDTO = {
  enrollmentId: number;
  privileges?: Privileges;
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

  public async execute({ enrollmentId, privileges }: DeleteAllNewSubmissionsRequestDTO): Promise<ResultType<DeleteAllNewSubmissionsResponseDTO>> {
    try {
      if (!privileges?.delete) {
        return Result.fail(new InsufficientPrivileges());
      }

      // find the enrollment and the submissions
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { enrollmentId },
        include: { newSubmissions: { include: { newAssignments: { include: { newParts: { include: { newUploadSlots: true } } } } } } },
      });
      if (!enrollment) {
        return Result.fail(new DeleteAllNewSubmissionsEnrollmentNotFound());
      }

      await this.prisma.newSubmission.deleteMany({ where: { enrollmentId } });

      await this.deleteFiles(enrollmentId);

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting enrollment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  /**
   * Delete files associated with this enrollment
   *
   * Swallows errors and logs them because it's not that important that the files are successfully deleted
   */
  private async deleteFiles(enrollmentId: number): Promise<void> {
    const paddedEnrollmentId = enrollmentId.toString().padStart(8, '0');

    // delete the files the student uploaded for assignments
    const assignmentFilespath = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;
    try {
      await this.fileService.rmdir(assignmentFilespath);
    } catch (err) {
      this.logger.error(`Error deleting assignment directory ${assignmentFilespath}`);
    }

    // delete the files the tutor uploaded for feedback
    const assignmentFeedback = `${this.configService.config.paths.unitFeedbackPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;
    try {
      await this.fileService.rmdir(assignmentFeedback);
    } catch (err) {
      this.logger.error(`Error deleting assignment directory ${assignmentFeedback}`);
    }
  }
}
