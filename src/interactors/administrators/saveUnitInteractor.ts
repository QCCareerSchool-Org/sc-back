import type { PrismaClient, Unit } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';

export type SaveUnitRequestDTO = {
  /** uuid */
  unitId: string;
  title: string | null;
  unitLetter: string;
  order: number;
  privileges?: Privileges;
};

export type SaveUnitResponseDTO = UnitDTO;

abstract class SaveUnitError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
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
        return failure(new InsufficientPrivileges());
      }

      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      const unit = await this.prisma.unit.findUnique({ where: { unitId: unitIdBin } });
      if (!unit) {
        return failure(new SaveUnitNotFound());
      }

      // validate the data
      if (request.title !== null) {
        if (request.title.length === 0) {
          return failure(new SaveUnitTitleEmpty());
        }
        if ([ ...request.title ].length > 191) {
          return failure(new SaveUnitTitleTooLong());
        }
      }

      if (request.unitLetter.length === 0) {
        return failure(new SaveUnitUnitLetterEmpty());
      }
      if ([ ...request.unitLetter ].length > 1) {
        return failure(new SaveUnitUnitLetterTooLong());
      }

      if (request.order < 0) {
        return failure(new SaveUnitOrderLessThanZero());
      }
      if (request.order > 127) {
        return failure(new SaveUnitOrderTooLarge());
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
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_unit_letter') {
            return failure(new SaveUnitUnitLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return success({
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
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
