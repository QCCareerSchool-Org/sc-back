import type { Course, Enrollment, NewUnit, PrismaClient } from '@prisma/client';

import type { NewUnitDTO } from '../../domain/newUnitDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { unitIsComplete } from './unitIsComplete.js';

export type SubmitNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type SubmitNewUnitResponseDTO = Omit<NewUnitDTO, 'complete' | 'points' | 'mark'>;

abstract class SubmitNewUnitError extends Error { }
export class SubmitNewUnitNotFound extends SubmitNewUnitError { }
export class SubmitNewUnitEnrollmentOnHold extends SubmitNewUnitError { }
export class SubmitNewUnitAlreadySubmitted extends SubmitNewUnitError { }
export class SubmitNewUnitAwaitingAdminComment extends SubmitNewUnitError { }
export class SubmitNewUnitIncomplete extends SubmitNewUnitError { }
export class SubmitNewUnitTutorNotAssigned extends SubmitNewUnitError { }
export class SubmitNewUnitDefaultPriceNotFound extends SubmitNewUnitError { }
export class SubmitNewUnitMultipleDefaultPricesFound extends SubmitNewUnitError { }

export class SubmitNewUnitInteractor implements IInteractor<SubmitNewUnitRequestDTO, SubmitNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId }: SubmitNewUnitRequestDTO): Promise<ResultType<SubmitNewUnitResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      let updatedUnit: NewUnit & { enrollment: Enrollment & { course: Course } };

      try {
        updatedUnit = await this.prisma.$transaction(async transaction => {

          const unit = await this.prisma.newUnit.findFirst({
            where: {
              enrollment: { studentId, courseId, course: { enabled: true } },
              unitId: unitIdBin,
            },
            include: {
              enrollment: { include: { tutor: true } },
              newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
              prices: true,
            },
          });

          if (!unit) {
            throw new SubmitNewUnitNotFound();
          }

          if (unit.enrollment.onHold) {
            throw new SubmitNewUnitEnrollmentOnHold();
          }

          if (unit.submitted) {
            throw new SubmitNewUnitAlreadySubmitted();
          }

          // see if the tutor has sent this back to the student, but an administrator hasn't reviewed it yet
          if (unit.tutorComment !== null && unit.adminComment === null) {
            throw new SubmitNewUnitAwaitingAdminComment();
          }

          if (!unitIsComplete(unit)) {
            throw new SubmitNewUnitIncomplete();
          }

          if (unit.enrollment.tutor === null) {
            throw new SubmitNewUnitTutorNotAssigned();
          }
          const tutor = unit.enrollment.tutor;

          // set any existing prices to disabled
          await transaction.newUnitPrice.updateMany({
            data: { selected: false },
            where: { unitId: unitIdBin },
          });

          // set one price to enabled
          const countryPrice = unit.prices.find(p => p.countryId === tutor.countryId);
          if (countryPrice) {
            await transaction.newUnitPrice.update({
              data: { selected: true },
              where: { unitPriceId: countryPrice.unitPriceId },
            });
          } else {
            const result = await transaction.newUnitPrice.updateMany({
              data: { selected: true },
              where: { unitId: unitIdBin, countryId: null },
            });
            if (result.count < 1) {
              this.logger.error(`No default price found for ${unitId}`);
              throw new SubmitNewUnitDefaultPriceNotFound();
            }
            if (result.count > 1) {
              this.logger.error(`Multiple default prices found for ${unitId}`);
              throw new SubmitNewUnitMultipleDefaultPricesFound();
            }
          }

          // update unit and return the updated unit
          return transaction.newUnit.update({
            data: {
              submitted: this.dateService.getDate(),
              skipped: false,
              tutorId: tutor.tutorId,
            },
            where: { unitId: unitIdBin },
            include: { enrollment: { include: { course: true } } },
          });
        });
      } catch (err) {
        if (err instanceof SubmitNewUnitError) {
          return Result.fail(err);
        }
        throw err;
      }

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
        adminComment: updatedUnit.adminComment,
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
      this.logger.error('error submitting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
