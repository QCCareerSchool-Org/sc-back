import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '../../interactors';
import type { ResultType } from '../../interactors/result';
import { Result } from '../../interactors/result';
import type { ILoggerService } from '../../services/logger';

type GetPasswordResetRequestDTO = {
  id: number;
  code: string;
};

type GetPasswordResetResponseDTO = {
  id: number;
  // code is ommitted
  administratorId: number | null;
  tutorId: number | null;
  studentId: number | null;
  used: boolean;
  requestDate: Date;
};

export class GetPasswordResetNotFound extends Error { }
export class GetPasswordResetInvalidCode extends Error { }

export class GetPasswordResetInteractor implements IInteractor<GetPasswordResetRequestDTO, GetPasswordResetResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, code }: GetPasswordResetRequestDTO): Promise<ResultType<GetPasswordResetResponseDTO>> {
    try {
      const passwordResetRequest = await this.prisma.passwordResetRequest.findUnique({ where: { id } });

      if (!passwordResetRequest) {
        return Result.fail(new GetPasswordResetNotFound());
      }

      if (passwordResetRequest.code !== code) {
        return Result.fail(new GetPasswordResetInvalidCode());
      }

      return Result.success({
        id: passwordResetRequest.id,
        administratorId: passwordResetRequest.administratorId,
        tutorId: passwordResetRequest.tutorId,
        studentId: passwordResetRequest.studentId,
        used: passwordResetRequest.used,
        requestDate: passwordResetRequest.requestDate,
      });

    } catch (err) {
      this.logger.error('error getting password reset', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
