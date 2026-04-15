import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { AuditorDTO } from '../../domain/auditors/auditorDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

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
        return failure(new AuditorNotFound());
      }

      return success({
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
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
