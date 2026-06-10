import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { CertificateDTO } from '../domain/certificateDTO.js';
import type { ICryptoService } from '../services/crypto/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IInteractor } from './index.js';

export type GetCertificateRequestDTO = {
  studentId: number;
  courseId: number;
};

export type GetCertificateResponseDTO = CertificateDTO;

export abstract class GetCertificateError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class GetCertificateNotFound extends GetCertificateError { }
export class GetCertificateNoGradDate extends GetCertificateError { }

export class GetCertificateInteractor implements IInteractor<GetCertificateRequestDTO, GetCertificateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId }: GetCertificateRequestDTO): Promise<ResultType<GetCertificateResponseDTO>> {
    try {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { student: { studentId }, course: { courseId }, graduated: true },
        include: {
          student: true,
          course: { include: { school: true, designation: true } },
        },
      });

      if (!enrollment) {
        return failure(new GetCertificateNotFound());
      }

      if (!enrollment.graduatedDate) {
        return failure(new GetCertificateNoGradDate());
      }

      return success({
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        graduationDate: enrollment.graduatedDate,

        courseName: enrollment.course.name,
        schoolName: enrollment.course.school.name,
        designation: enrollment.course.designation
          ? {
            name: enrollment.course.designation.name,
            code: enrollment.course.designation.code,
          }
          : undefined,
        signature: this.cryptoService.aes256gcmEncrypt(`${studentId}:${courseId}`),
      });

    } catch (err) {
      this.logger.error('error getting certificate', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
