import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type InsertOrUpdateMetadataRequestDTO = {
  studentId: number;
  courseId: number;
  name: string;
  value: string | null;
};

export type InsertOrUpdateMetadataResponseDTO = void;

abstract class InsertOrUpdateMetadataError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class InsertOrUpdateMetadataEnrollmentNotFound extends InsertOrUpdateMetadataError { }
export class InsertOrUpdateMetadataMetadataNotFound extends InsertOrUpdateMetadataError { }
export class InsertOrUpdateMetadataValueTooLong extends InsertOrUpdateMetadataError { }

export class InsertOrUpdateMetadataInteractor extends StudentInteractor<InsertOrUpdateMetadataRequestDTO, InsertOrUpdateMetadataResponseDTO> {

  public static valueMaxLength = 191;

  public constructor(
    private readonly prisma: PrismaClient,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, name, value }: InsertOrUpdateMetadataRequestDTO): Promise<ResultType<InsertOrUpdateMetadataResponseDTO>> {
    try {
      const [ enrollment, metadata ] = await Promise.all([
        this.prisma.enrollment.findFirst({ where: { studentId, courseId } }),
        this.prisma.metadata.findFirst({ where: { name } }),
      ]);

      if (!enrollment) {
        return failure(new InsertOrUpdateMetadataEnrollmentNotFound());
      }
      if (!metadata) {
        return failure(new InsertOrUpdateMetadataMetadataNotFound());
      }

      if (value !== null && value.length >= InsertOrUpdateMetadataInteractor.valueMaxLength) {
        return failure(new InsertOrUpdateMetadataValueTooLong());
      }

      await this.prisma.enrollmentsOnMetadata.upsert({
        where: {
          id: {
            enrollmentId: enrollment.enrollmentId,
            metadataId: metadata.metadataId,
          },
        },
        update: {
          value,
        },
        create: {
          enrollmentId: enrollment.enrollmentId,
          metadataId: metadata.metadataId,
          value,
        },
      });

      return success(undefined);

    } catch (err) {
      this.logger.error('error inserting or updating metadata', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
