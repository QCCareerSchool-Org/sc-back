import type { PrismaClient } from '@prisma/client';

import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewUploadSlotDTO } from '../../domain/students/newUploadSlotDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type EraseNewUploadSlotRequestDTO = {
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
};

export type EraseNewUploadSlotResponseDTO = NewUploadSlotDTO;

export class EraseNewUploadSlotNotFound extends Error { }
export class EraseNewUploadSlotSubmissionSubmitted extends Error { }
export class EraseNewUploadSlotUnlinkError extends Error { }

export class EraseNewUploadSlotInteractor implements IInteractor<EraseNewUploadSlotRequestDTO, EraseNewUploadSlotResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, submissionId, assignmentId, partId, uploadSlotId }: EraseNewUploadSlotRequestDTO): Promise<ResultType<EraseNewUploadSlotResponseDTO>> {
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
        throw new EraseNewUploadSlotNotFound();
      }

      if (newUploadSlot.newPart.newAssignment.newSubmission.submitted) {
        throw new EraseNewUploadSlotSubmissionSubmitted();
      }

      const localDate = this.dateService.getLocalDate() + 'Z'; // TODO: Update if Prisma ever gets timezones working properly

      const updatedUploadSlot = await this.prisma.$transaction(async transaction => {
        const updated = await transaction.newUploadSlot.update({
          data: {
            filename: null,
            filesize: null,
            mimeTypeId: null,
            modified: localDate,
          },
          where: { uploadSlotId: uploadSlotIdBin },
          include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
        });

        // delete the file
        const paddedStudentId = studentId.toString().padStart(8, '0');
        const filePath = `${this.configService.config.paths.assignmentsPath}/${paddedStudentId.substring(0, 4)}/${paddedStudentId.substring(4, 8)}/${uploadSlotId}`;
        try {
          await this.fileService.unlink(filePath);
        } catch (err) {
          this.logger.error('Could not delete file', err);
          throw new EraseNewUploadSlotUnlinkError(filePath);
        }

        return updated;
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        mark: updatedUploadSlot.newPart.newAssignment.newSubmission.closed ? updatedUploadSlot.mark : null, // hide mark unless the submission is marked
        notes: null, // students should never see the tutor's notes
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        filename: updatedUploadSlot.filename,
        filesize: updatedUploadSlot.filesize,
        mimeTypeId: updatedUploadSlot.mimeTypeId,
        complete: updatedUploadSlot.filename !== null,
        created: updatedUploadSlot.created,
        modified: updatedUploadSlot.modified,
      });

    } catch (err) {
      this.logger.error('error deleting upload slot file', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
