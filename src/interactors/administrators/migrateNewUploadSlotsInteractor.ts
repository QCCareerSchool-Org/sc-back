import type { Enrollment, NewAssignment, NewPart, NewSubmission, NewUploadSlot, PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type MigrateNewUploadSlotsRequestDTO = void;

export type MigrateNewUploadSlotsResponseDTO = void;

export class MigrateNewUploadSlotsEnrollmentNotFound extends Error { }

export class MigrateNewUploadSlotsInteractor implements IInteractor<MigrateNewUploadSlotsRequestDTO, MigrateNewUploadSlotsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(): Promise<ResultType<MigrateNewUploadSlotsResponseDTO>> {
    try {
      // find all upload slots that are not set to the new location
      const uploadSlots = await this.prisma.newUploadSlot.findMany({
        where: { newLocation: false },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: { include: { enrollment: true } } } } } } },
      });

      for (const uploadSlot of uploadSlots) {
        // start a transaction
        await this.prisma.$transaction(async transaction => {
          // update the record
          await transaction.newUploadSlot.update({
            where: { uploadSlotId: uploadSlot.uploadSlotId },
            data: { newLocation: true },
          });

          // move the file
          const enrollment = uploadSlot.newPart.newAssignment.newSubmission.enrollment;
          await this.moveFile(enrollment.studentId, enrollment.enrollmentId, this.uuidService.binToUUID(uploadSlot.uploadSlotId));
        });

        return Result.success(undefined); // return early for testing
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error migrating upload slots', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async moveFile(studentId: number, enrollmentId: number, uploadSlotId: string): Promise<void> {
    const paddedStudentId = studentId.toString().padStart(8, '0');
    const paddedEnrollmentId = enrollmentId.toString().padStart(8, '0');

    const oldPath = `${this.configService.config.paths.assignmentsPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}`;
    const newPath = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;

    if (await this.fileService.stat(`${oldPath}/${uploadSlotId}`)) {
      await this.fileService.mkdir(newPath);
      await this.fileService.rename(`${oldPath}/${uploadSlotId}`, `${newPath}/${uploadSlotId}`);
    }
  }
}
