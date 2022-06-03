import type { PrismaClient } from '@prisma/client';

import type { NewUnitDTO } from '../../domain/newUnitDTO.js';
import type { NewUnitReturnDTO } from '../../domain/newUnitReturnDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type CloseNewUnitReturnRequestDTO = {
  unitReturnId: string;
  adminComment: string;
};

export type CloseNewUnitReturnResponseDTO = NewUnitReturnDTO & {
  newUnit: Omit<NewUnitDTO, 'points' | 'mark' | 'complete'>;
};

export class CloseNewUnitReturnNotFound extends Error { }
export class CloseNewUnitReturnAlreadyCompleted extends Error { }
export class CloseNewUnitReturnAdminCommentEmpty extends Error { }

export class CloseNewUnitReturnInteractor implements IInteractor<CloseNewUnitReturnRequestDTO, CloseNewUnitReturnResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ unitReturnId, adminComment }: CloseNewUnitReturnRequestDTO): Promise<ResultType<CloseNewUnitReturnResponseDTO>> {
    try {
      const unitReturnIdBin = this.uuidService.uuidToBin(unitReturnId);

      // find the unit return and unit
      const unitReturn = await this.prisma.newUnitReturn.findFirst({
        where: { unitReturnId: unitReturnIdBin },
      });
      if (!unitReturn) {
        return Result.fail(new CloseNewUnitReturnNotFound());
      }

      if (unitReturn.completed) {
        return Result.fail(new CloseNewUnitReturnAlreadyCompleted());
      }

      if (adminComment.length === 0) {
        return Result.fail(new CloseNewUnitReturnAdminCommentEmpty());
      }

      const updatedUnitReturn = await this.prisma.newUnitReturn.update({
        data: {
          completed: this.dateService.getDate(),
          newUnit: { update: { adminComment } },
        },
        where: { unitReturnId: unitReturnIdBin },
        include: { newUnit: true },
      });

      return Result.success({
        unitReturnId: this.uuidService.binToUUID(updatedUnitReturn.unitReturnId),
        unitId: this.uuidService.binToUUID(updatedUnitReturn.unitId),
        returned: updatedUnitReturn.returned,
        completed: updatedUnitReturn.completed,
        newUnit: {
          unitId: this.uuidService.binToUUID(updatedUnitReturn.newUnit.unitId),
          enrollmentId: updatedUnitReturn.newUnit.enrollmentId,
          tutorId: updatedUnitReturn.newUnit.tutorId,
          unitLetter: updatedUnitReturn.newUnit.unitLetter,
          title: updatedUnitReturn.newUnit.title,
          description: updatedUnitReturn.newUnit.description,
          markingCriteria: updatedUnitReturn.newUnit.markingCriteria,
          optional: updatedUnitReturn.newUnit.optional,
          order: updatedUnitReturn.newUnit.order,
          tutorComment: updatedUnitReturn.newUnit.tutorComment,
          adminComment: updatedUnitReturn.newUnit.adminComment,
          submitted: updatedUnitReturn.newUnit.submitted,
          transferred: updatedUnitReturn.newUnit.transferred,
          closed: updatedUnitReturn.newUnit.closed,
          skipped: updatedUnitReturn.newUnit.skipped,
          responseFilename: updatedUnitReturn.newUnit.responseFilename,
          responseFilesize: updatedUnitReturn.newUnit.responseFilesize,
          responseMimeTypeId: updatedUnitReturn.newUnit.responseMimeTypeId,
          created: updatedUnitReturn.newUnit.created,
          modified: updatedUnitReturn.newUnit.modified,
        },
      });

    } catch (err) {
      this.logger.error('error updating unit return', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
