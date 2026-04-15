import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { PasswordResetRequestDTO } from '../../domain/passwordResetRequestDTO.js';
import type { IInteractor } from '../../interactors/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';

type GetPasswordResetRequestDTO = {
  id: number;
  code: string;
};

export type GetPasswordResetResponseDTO = PasswordResetRequestDTO;

export class GetPasswordResetNotFound extends Error { }
export class GetPasswordResetInvalidCode extends Error { }

export class GetPasswordResetInteractor implements IInteractor<GetPasswordResetRequestDTO, GetPasswordResetResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, code }: GetPasswordResetRequestDTO): Promise<ResultType<GetPasswordResetResponseDTO>> {
    try {
      const passwordResetRequest = await this.prisma.passwordResetRequest.findUnique({
        where: { id },
      });

      if (!passwordResetRequest) {
        return failure(new GetPasswordResetNotFound());
      }

      if (passwordResetRequest.code !== code) {
        return failure(new GetPasswordResetInvalidCode());
      }

      return success({
        id: passwordResetRequest.id,
        code: passwordResetRequest.code,
        studentId: passwordResetRequest.studentId,
        tutorId: passwordResetRequest.tutorId,
        administratorId: passwordResetRequest.administratorId,
        auditorId: passwordResetRequest.auditorId,
        username: passwordResetRequest.username,
        used: passwordResetRequest.used,
        requestDate: passwordResetRequest.requestDate,
        expiryDate: this.dateService.fixPrismaReadDate(passwordResetRequest.expiryDate),
      });

    } catch (err) {
      this.logger.error('error getting password reset', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
