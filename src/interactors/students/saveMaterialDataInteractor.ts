import type { PrismaClient } from '@prisma/client';

import type { IDateService } from '../../services/date/index.js';
import type { IIntervalService } from '../../services/interval/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type SaveMaterialDataRequestDTO = {
  studentId: number;
  materialId: string;
  data: Record<string, string>;
};

export type SaveMaterialDataResponseDTO = void;

export class SaveMaterialDataNotFound extends Error { }

export class SaveMaterialDataInteractor extends StudentInteractor<SaveMaterialDataRequestDTO, SaveMaterialDataResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly intervalService: IIntervalService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, materialId, data }: SaveMaterialDataRequestDTO): Promise<ResultType<SaveMaterialDataResponseDTO>> {
    try {
      const materialIdBin = this.uuidService.uuidToBin(materialId);

      const material = await this.prisma.material.findFirst({
        where: {
          materialId: materialIdBin,
          unit: { course: { enrollments: { some: { student: { studentId } } } } },
        },
        include: { unit: true },
      });

      if (!material) {
        return Result.fail(new SaveMaterialDataNotFound());
      }

      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId: material.unit.courseId },
        include: { student: true },
      });

      this.checkEnrollment(enrollment);

      if (!enrollment) {
        return Result.fail(new SaveMaterialDataNotFound());
      }

      const materialData = Object.entries(data).map(([ key, value ]) => ({
        materialId: materialIdBin,
        enrollmentId: enrollment.enrollmentId,
        key,
        value,
      }));

      // re-calculate total time
      let totalTimeMS = 0;
      for (const d of materialData) {
        if (d.key === 'cmi.session_time' || d.key === 'cmi.total_time') {
          totalTimeMS += this.intervalService.parse(d.value);
        }
      }
      const totalTimeInterval = this.intervalService.format(totalTimeMS);

      const totalTimeRecord = materialData.find(m => m.key === 'cmi.total_time');
      if (totalTimeRecord) {
        totalTimeRecord.value = totalTimeInterval;
      } else {
        materialData.push({
          materialId: materialIdBin,
          enrollmentId: enrollment.enrollmentId,
          key: 'cmi.total_time',
          value: totalTimeInterval,
        });
      }

      await this.prisma.$transaction(async transaction => {
        await transaction.materialData.deleteMany({ where: { materialId: materialIdBin, enrollmentId: enrollment.enrollmentId } });
        await transaction.materialData.createMany({ data: materialData });
      });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error getting material', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
