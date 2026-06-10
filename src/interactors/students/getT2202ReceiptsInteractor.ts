import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { T2202ReceiptDTO } from '../../domain/t2202ReceiptDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetT2202ReceiptsRequestDTO = {
  studentId: number;
};

export type GetT2202ReceiptsResponseDTO = Array<T2202ReceiptDTO & {
  enrollment: EnrollmentDTO & {
    course: CourseDTO;
  };
}>;

export class GetT2202ReceiptsInteractor extends StudentInteractor<GetT2202ReceiptsRequestDTO, GetT2202ReceiptsResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId }: GetT2202ReceiptsRequestDTO): Promise<ResultType<GetT2202ReceiptsResponseDTO>> {
    try {
      const t2202Receipts = await this.prisma.t2202Receipt.findMany({
        where: { enrollment: { studentId } },
        include: { enrollment: { include: { course: true } } },
      });

      return success(t2202Receipts.map(t => ({
        t2202ReceiptId: t.t2202ReceiptId,
        enrollmentId: t.enrollmentId,
        startYear: t.startYear,
        startMonth: t.startMonth,
        endYear: t.endYear,
        endMonth: t.endMonth,
        tuition: t.tuition.toNumber(),
        address1: t.address1,
        address2: t.address2,
        city: t.city,
        postalCode: t.postalCode,
        provinceId: t.provinceId,
        countryId: t.countryId,
        accessed: t.accessed,
        version: t.version,
        enrollment: {
          enrollmentId: t.enrollment.enrollmentId,
          courseId: t.enrollment.courseId,
          studentId: t.enrollment.studentId,
          studentNumber: t.enrollment.studentNumber,
          tutorId: t.enrollment.tutorId,
          maxAssignments: t.enrollment.maxAssignments,
          graduated: t.enrollment.graduated,
          graduatedDate: this.dateService.fixPrismaReadDate(t.enrollment.graduatedDate),
          assignmentsDisabled: t.enrollment.assignmentsDisabled,
          quizzesDisabled: t.enrollment.quizzesDisabled,
          onHold: t.enrollment.onHold,
          holdReason: t.enrollment.holdReason,
          currencyCode: t.enrollment.currencyCode,
          courseCost: t.enrollment.courseCost.toNumber(),
          amountPaid: t.enrollment.amountPaid.toNumber(),
          monthlyInstallment: t.enrollment.monthlyInstallment?.toNumber() ?? null,
          enrollmentDate: this.dateService.fixPrismaReadDate(t.enrollment.enrollmentDate),
          dueDate: this.dateService.fixPrismaReadDate(t.enrollment.dueDate),
          fastTrack: t.enrollment.fastTrack,
          paymentsDisabled: t.enrollment.paymentsDisabled,
          course: {
            courseId: t.enrollment.course.courseId,
            schoolId: t.enrollment.course.schoolId,
            variantId: t.enrollment.course.variantId,
            code: t.enrollment.course.code,
            version: t.enrollment.course.version,
            studentTypeId: t.enrollment.course.studentTypeId,
            name: t.enrollment.course.name,
            subheading: t.enrollment.course.subheading,
            courseGuide: t.enrollment.course.courseGuide,
            quizzesEnabled: t.enrollment.course.quizzesEnabled,
            noTutor: t.enrollment.course.noTutor,
            submissionType: t.enrollment.course.submissionType,
            enabled: t.enrollment.course.enabled,
            order: t.enrollment.course.order,
            submissionsEnabled: t.enrollment.course.submissionsEnabled,
            designationId: t.enrollment.course.designationId,
            entityVersion: t.enrollment.course.entityVersion,
          },
        },
      })));

    } catch (err) {
      this.logger.error('error getting t2202 receipts', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
