import type { PrismaClient } from '@prisma/client';

import type { IInteractor, InteractorFile } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type UploadNewUnitFeedbackRequestDTO = {
  tutorId: number;
  studentId: number;
  unitId: string;
  file: InteractorFile;
};

export type UploadNewUnitFeedbackResponseDTO = NewUnitDTO;

export class UploadNewUnitFeedbackNotFound extends Error { }
export class UploadNewUnitFeedbackNotSubmitted extends Error { }
export class UploadNewUnitFeedbackAlreadyClosed extends Error { }
export class UploadNewUnitFeedbackWrongTutor extends Error { }
export class UploadNewUnitUnknownMimeType extends Error { }
export class UploadNewUnitInvalidMimeType extends Error { }
export class UploadNewUnitFeedbackCouldNotCreateDirectory extends Error { }
export class UploadNewUnitFeedbackFileWriteError extends Error { }

export class UploadNewUnitFeedbackInteractor implements IInteractor<UploadNewUnitFeedbackRequestDTO, UploadNewUnitFeedbackResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId, file }: UploadNewUnitFeedbackRequestDTO): Promise<ResultType<UploadNewUnitFeedbackResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const newUnit = await this.prisma.newUnit.findFirst({
        where: {
          unitId: unitIdBin,
          enrollment: { studentId },
        },
      });

      if (!newUnit) {
        return Result.fail(new UploadNewUnitFeedbackNotFound());
      }

      if (!newUnit.submitted) {
        return Result.fail(new UploadNewUnitFeedbackNotSubmitted());
      }

      if (newUnit.marked) {
        return Result.fail(new UploadNewUnitFeedbackAlreadyClosed());
      }

      if (newUnit.tutorId !== tutorId) {
        return Result.fail(new UploadNewUnitFeedbackWrongTutor());
      }

      const updatedUnit = await this.prisma.$transaction(async transaction => {
        const mimeType = await transaction.mimeType.findUnique({
          where: { mimeTypeId: file.mimeType },
        });
        if (!mimeType) {
          throw new UploadNewUnitUnknownMimeType(file.mimeType);
        }

        if (!mimeType.mimeTypeId.startsWith('audio/')) {
          throw new UploadNewUnitInvalidMimeType(mimeType.mimeTypeId);
        }

        const updated = await transaction.newUnit.update({
          data: {
            responseFilename: file.filename,
            responseFilesize: file.size,
            responseMimeTypeId: mimeType.mimeTypeId,
          },
          where: { unitId: unitIdBin },
          include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
        });

        const paddedStudentId = studentId.toString().padStart(8, '0');

        const partialPath1 = this.configService.config.paths.unitFeedbackPath;
        try {
          if (!await this.fileService.stat(partialPath1)) {
            await this.fileService.mkdir(partialPath1);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUnitFeedbackCouldNotCreateDirectory(partialPath1);
        }

        const partialPath2 = `${partialPath1}/${paddedStudentId.substring(0, 4)}`;
        try {
          if (!await this.fileService.stat(partialPath2)) {
            await this.fileService.mkdir(partialPath2);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUnitFeedbackCouldNotCreateDirectory(partialPath2);
        }

        const partialPath3 = `${partialPath2}/${paddedStudentId.substring(4, 8)}`;
        try {
          if (!await this.fileService.stat(partialPath3)) {
            await this.fileService.mkdir(partialPath3);
          }
        } catch (err) {
          this.logger.error('Could not create directory', err);
          throw new UploadNewUnitFeedbackCouldNotCreateDirectory(partialPath3);
        }

        // save the file
        const filePath = `${partialPath3}/${unitId}`;
        try {
          await this.fileService.writeFile(filePath, file.data);
        } catch (err) {
          this.logger.error(`Could not write feedback to ${filePath}`, err);
          throw new UploadNewUnitFeedbackFileWriteError();
        }

        return updated;
      });

      let unitComplete = true;
      let unitMarked = true;
      let unitPoints = 0;
      let unitMark = 0;

      for (const a of updatedUnit.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        for (const p of a.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          for (const t of p.newTextBoxes) {
            const textBoxComplete = t.text.length > 0;
            if (!textBoxComplete && !t.optional) {
              partComplete = false;
            }
            if (textBoxComplete && t.mark === null && t.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (textBoxComplete || !t.optional) {
              partPoints += t.points;
              partMark += t.mark ?? 0;
            }
          }
          for (const u of p.newUploadSlots) {
            const uploadSlotComplete = u.filename !== null;
            if (!uploadSlotComplete && !u.optional) {
              partComplete = false;
            }
            if (uploadSlotComplete && u.mark === null && u.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (uploadSlotComplete || !u.optional) {
              partPoints += u.points;
              partMark += u.mark ?? 0;
            }
          }
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
        }
        if (!assignmentComplete && !a.optional) {
          unitComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          unitMarked = false;
        }
        // ignore incomplete, optional assignments
        if (assignmentComplete || !a.optional) {
          unitPoints += assignmentPoints;
          unitMark += assignmentMark;
        }
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        enrollmentId: updatedUnit.enrollmentId,
        tutorId: updatedUnit.tutorId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        description: updatedUnit.description,
        markingCriteria: updatedUnit.markingCriteria,
        optional: updatedUnit.optional,
        order: updatedUnit.order,
        tutorComment: updatedUnit.tutorComment,
        adminComment: updatedUnit.adminComment,
        submitted: updatedUnit.submitted,
        skipped: updatedUnit.skipped,
        transferred: updatedUnit.transferred,
        marked: updatedUnit.marked,
        responseFilename: updatedUnit.responseFilename,
        responseFilesize: updatedUnit.responseFilesize,
        responseMimeTypeId: updatedUnit.responseMimeTypeId,
        created: updatedUnit.created,
        modified: updatedUnit.modified,
        complete: unitComplete,
        points: unitPoints,
        mark: unitMarked ? unitMark : null,
      });

    } catch (err) {
      this.logger.error('error uploading new unit feedback', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
