import type { PrismaClient } from '@prisma/client';

import type { AuditorDTO } from '../../domain/auditors/auditorDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetAuditorRequestDTO = {
  auditorId: number;
};

export type GetAuditorResponseDTO = AuditorDTO;

export class AuditorNotFound extends Error { }

export class GetAuditorInteractor implements IInteractor<GetAuditorRequestDTO, GetAuditorResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ auditorId }: GetAuditorRequestDTO): Promise<ResultType<GetAuditorResponseDTO>> {
    try {
      const auditor = await this.prisma.auditor.findFirst({
        where: { auditorId },
      });

      if (!auditor) {
        return Result.fail(new AuditorNotFound());
      }

      return Result.success({
        auditorId: auditor.auditorId,
        emailAddress: auditor.emailAddress,
        firstName: auditor.firstName,
        lastName: auditor.lastName,
        passwordChanged: auditor.passwordChanged,
        expiry: auditor.expiry === null ? null : this.dateService.fixPrismaReadDate(auditor.expiry),
        created: this.dateService.fixPrismaReadDate(auditor.created),
        modified: auditor.modified === null ? null : this.dateService.fixPrismaReadDate(auditor.modified),
      });

    } catch (err) {
      this.logger.error('error getting auditor', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
