import { createCipheriv, randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { CertificateDTO } from '../domain/certificateDTO.js';
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

const ALGORITHM = 'aes-256-gcm';
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

const encrypt = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  return Buffer.concat([ iv, authTag, encrypted ]).toString('base64url');
};

export class GetCertificateNotFound extends GetCertificateError { }
export class GetCertificateNoGradDate extends GetCertificateError { }
export class GetCertificateNoDesignation extends GetCertificateError { }

export class GetCertificateInteractor implements IInteractor<GetCertificateRequestDTO, GetCertificateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
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

      if (!enrollment.course.designation) {
        return failure(new GetCertificateNoDesignation());
      }

      return success({
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        graduationDate: enrollment.graduatedDate,

        courseName: enrollment.course.name,
        schoolName: enrollment.course.school.name,
        designation: {
          name: enrollment.course.designation.name,
          code: enrollment.course.designation.code,
        },
        signature: encrypt(`${studentId}:${courseId}`),
      });

    } catch (err) {
      this.logger.error('error getting certificate', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
