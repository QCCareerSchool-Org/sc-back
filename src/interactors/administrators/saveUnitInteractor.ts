import type { PrismaClient, Unit } from '@prisma/client';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';
import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type SaveUnitRequestDTO = {
  /** uuid */
  unitId: string;
  title: string | null;
  unitLetter: string;
  order: number;
  privileges?: Privileges;
};

export type SaveUnitResponseDTO = UnitDTO;

abstract class SaveUnitError extends Error { }
export class SaveUnitNotFound extends SaveUnitError { }
export class SaveUnitTitleEmpty extends SaveUnitError { }
export class SaveUnitTitleTooLong extends SaveUnitError { }
export class SaveUnitUnitLetterEmpty extends SaveUnitError { }
export class SaveUnitUnitLetterTooLong extends SaveUnitError { }
export class SaveUnitOrderLessThanZero extends SaveUnitError { }
export class SaveUnitOrderTooLarge extends SaveUnitError { }
export class SaveUnitUnitLetterAlreadyInUse extends SaveUnitError { }

export class SaveUnitInteractor implements IInteractor<SaveUnitRequestDTO, SaveUnitResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveUnitRequestDTO): Promise<ResultType<SaveUnitResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      const unit = await this.prisma.unit.findUnique({ where: { unitId: unitIdBin } });
      if (!unit) {
        return Result.fail(new SaveUnitNotFound());
      }

      // validate the data
      if (request.title !== null) {
        if (request.title.length === 0) {
          return Result.fail(new SaveUnitTitleEmpty());
        }
        if ([ ...request.title ].length > 191) {
          return Result.fail(new SaveUnitTitleTooLong());
        }
      }

      if (request.unitLetter.length === 0) {
        return Result.fail(new SaveUnitUnitLetterEmpty());
      }
      if ([ ...request.unitLetter ].length > 1) {
        return Result.fail(new SaveUnitUnitLetterTooLong());
      }

      if (request.order < 0) {
        return Result.fail(new SaveUnitOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new SaveUnitOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      let updatedUnit: Unit;
      try {
        updatedUnit = await this.prisma.unit.update({
          data: {
            title: request.title,
            unitLetter: request.unitLetter,
            order: request.order,
            modified: prismaNow,
          },
          where: { unitId: unitIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_unit_letter') {
            return Result.fail(new SaveUnitUnitLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        courseId: updatedUnit.courseId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        order: updatedUnit.order,
        created: this.dateService.fixPrismaReadDate(updatedUnit.created),
        modified: this.dateService.fixPrismaReadDate(updatedUnit.modified),
      });

    } catch (err) {
      this.logger.error('error updating unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
