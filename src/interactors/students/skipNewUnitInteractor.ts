import type { PrismaClient } from '@prisma/client';

import type { NewUnitDTO } from '../../domain/newUnitDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type SkipNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type SkipNewUnitResponseDTO = Omit<NewUnitDTO, 'complete' | 'points' | 'mark'>;

export class SkipNewUnitNotFound extends Error { }
export class SkipNewUnitEnrollmentOnHold extends Error { }
export class SkipNewUnitAlreadySubmitted extends Error { }

export class SkipNewUnitInteractor implements IInteractor<SkipNewUnitRequestDTO, SkipNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId }: SkipNewUnitRequestDTO): Promise<ResultType<SkipNewUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollment: { studentId, courseId, course: { enabled: true } },
          unitId: unitIdBin,
        },
        include: {
          enrollment: true,
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
        },
      });

      if (!unit) {
        return Result.fail(new SkipNewUnitNotFound());
      }

      if (unit.enrollment.onHold) {
        return Result.fail(new SkipNewUnitEnrollmentOnHold());
      }

      if (unit.submitted) {
        return Result.fail(new SkipNewUnitAlreadySubmitted());
      }

      const updatedUnit = await this.prisma.newUnit.update({
        data: {
          submitted: this.dateService.getDate(),
          skipped: true,
          tutorId: unit.enrollment.tutorId,
        },
        where: { unitId: unitIdBin },
        include: { enrollment: { include: { course: true } } },
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        enrollmentId: updatedUnit.enrollmentId,
        tutorId: updatedUnit.tutorId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        description: updatedUnit.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: updatedUnit.optional,
        order: updatedUnit.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: unit.adminComment,
        submitted: updatedUnit.submitted,
        transferred: updatedUnit.transferred,
        closed: updatedUnit.closed,
        skipped: updatedUnit.skipped,
        responseFilename: updatedUnit.responseFilename === null ? null : `${updatedUnit.enrollment.course.code}${updatedUnit.enrollment.enrollmentId} Unit ${updatedUnit.unitLetter}.mp3`,
        responseFilesize: updatedUnit.responseFilesize,
        responseMimeTypeId: updatedUnit.responseMimeTypeId,
        created: updatedUnit.created,
        modified: updatedUnit.modified,
      });

    } catch (err) {
      this.logger.error('error skipping new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
