import type { PrismaClient } from '@prisma/client';

import type { TutorDTO } from '../../domain/tutorDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetAllTutorsBySchoolRequestDTO = {
  schoolId: number;
};

export type GetAllTutorsBySchoolResponseDTO = TutorDTO[];

export class GetAllTutorsBySchoolInteractor implements IInteractor<GetAllTutorsBySchoolRequestDTO, GetAllTutorsBySchoolResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId }: GetAllTutorsBySchoolRequestDTO): Promise<ResultType<GetAllTutorsBySchoolResponseDTO>> {
    try {
      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const tutors = await this.prisma.tutor.findMany({
        where: { schoolId, OR: [ { expiry: null }, { expiry: { gt: prismaNow } } ] },
        orderBy: [ { firstName: 'asc' }, { lastName: 'asc' } ],
      });

      return Result.success(tutors.map(t => ({
        tutorId: t.tutorId,
        firstName: t.firstName,
        lastName: t.lastName,
        introduction: false,
      })));

    } catch (err) {
      this.logger.error('error getting tutors', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
