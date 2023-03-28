import type { PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';
import { InsufficientPrivileges } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteEnrollmentRequestDTO = {
  enrollmentId: number;
  privileges?: Privileges;
};

export type DeleteEnrollmentResponseDTO = void;

export class DeleteEnrollmentNotFound extends Error { }
export class DeleteEnrollmentSubmissionsPresent extends Error { }

export class DeleteEnrollmentInteractor implements IInteractor<DeleteEnrollmentRequestDTO, DeleteEnrollmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ enrollmentId, privileges }: DeleteEnrollmentRequestDTO): Promise<ResultType<DeleteEnrollmentResponseDTO>> {
    try {
      if (!privileges?.delete) {
        return Result.fail(new InsufficientPrivileges());
      }

      // find the enrollment
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { enrollmentId },
        include: { newSubmissions: true, oldSubmissions: true },
      });
      if (!enrollment) {
        return Result.fail(new DeleteEnrollmentNotFound());
      }

      if (enrollment.newSubmissions.length || enrollment.oldSubmissions.length) {
        return Result.fail(new DeleteEnrollmentSubmissionsPresent());
      }

      await this.prisma.enrollment.delete({ where: { enrollmentId } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting enrollment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
