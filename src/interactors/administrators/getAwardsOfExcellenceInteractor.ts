import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { AwardDTO } from '../../domain/awardDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type GetAllAwardsOfExcellenceRequestDTO = { startDate: Date; endDate: Date };

export type GetAllAwardsOfExcellenceResponseDTO = AwardDTO[];

export class GetAllAwardsOfExcellenceInteractor implements IInteractor<GetAllAwardsOfExcellenceRequestDTO, GetAllAwardsOfExcellenceResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
  ) { /* empty */ }

  public async execute({ startDate, endDate }: GetAllAwardsOfExcellenceRequestDTO): Promise<ResultType<GetAllAwardsOfExcellenceResponseDTO>> {
    try {
      const prismaStartDate = this.dateService.fixPrismaWriteDate(startDate);
      const prismaEndDate = this.dateService.fixPrismaWriteDate(endDate);

      const awards = await this.prisma.awardOfExcellence.findMany({
        include: { newSubmission: { include: {
          enrollment: { include: { student: true, course: { include: { school: true } } } },
        } } },
        where: { created: { gte: prismaStartDate, lt: prismaEndDate } },
      });

      return success(awards.map(a => ({
        submissionId: this.uuidService.binToUUID(a.submissionId),
        courseName: a.newSubmission.enrollment.course.name,
        schoolName: a.newSubmission.enrollment.course.school.name,
        unitLetter: a.newSubmission.unitLetter,
        grade: a.grade,
        name: a.newSubmission.enrollment.student.firstName + ' ' + a.newSubmission.enrollment.student.lastName,
        created: a.created,
      })));

    } catch (err) {
      this.logger.error('error getting awards', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
