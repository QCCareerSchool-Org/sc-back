import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import { EnrollmentDTO } from '../../domain/student/enrollmentDTO';
import { NewAssignmentDTO } from '../../domain/student/newAssignmentDTO';
import { NewPartDTO } from '../../domain/student/newPartDTO';
import { NewTextBoxDTO } from '../../domain/student/newTextBoxDTO';
import { NewUnitDTO } from '../../domain/student/newUnitDTO';
import { NewUploadSlotDTO } from '../../domain/student/newUploadSlotDTO';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type GetNewUnitResponseDTO = NewUnitDTO & {
  enrollment: EnrollmentDTO;
  newAssignments: Array<NewAssignmentDTO & {
    newParts: Array<NewPartDTO & {
      newTextBoxes: NewTextBoxDTO[];
      newUploadSlots: NewUploadSlotDTO[];
    }>;
  }>;
};

export class GetNewUnitNotFound extends Error { }

export class GetNewUnitInteractor implements IInteractor<GetNewUnitRequestDTO, GetNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId }: GetNewUnitRequestDTO): Promise<ResultType<GetNewUnitResponseDTO>> {
    try {
      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollment: { studentId, courseId, course: { enabled: true } },
          unitId: this.uuidService.uuidToBin(unitId),
        },
        include: {
          enrollment: true,
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
        },
      });

      if (!unit) {
        return Result.fail(new GetNewUnitNotFound());
      }

      let unitComplete = true;

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        enrollmentId: unit.enrollmentId,
        tutorId: unit.tutorId,
        unitLetter: unit.unitLetter,
        title: unit.title,
        description: unit.description,
        optional: unit.optional,
        adminComment: unit.adminComment,
        submitted: unit.submitted,
        skipped: unit.skipped,
        transferred: unit.transferred,
        marked: unit.marked,
        created: unit.created,
        enrollment: {
          enrollmentId: unit.enrollment.enrollmentId,
          courseId: unit.enrollment.courseId,
          studentNumber: unit.enrollment.studentNumber,
          tutorId: unit.enrollment.tutorId,
          maxAssignments: unit.enrollment.maxAssignments,
          graduated: unit.enrollment.graduated,
          assignmentsDisabled: unit.enrollment.assignmentsDisabled,
          quizzesDisabled: unit.enrollment.quizzesDisabled,
          onHold: unit.enrollment.onHold,
          holdReason: unit.enrollment.holdReason,
          currencyCode: unit.enrollment.currencyCode,
          courseCost: unit.enrollment.courseCost.toNumber(),
          amountPaid: unit.enrollment.amountPaid.toNumber(),
          monthlyInstallment: unit.enrollment.monthlyInstallment === null ? null : unit.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: unit.enrollment.enrollmentDate,
          fastTrack: unit.enrollment.fastTrack,
          paymentsDisabled: unit.enrollment.paymentsDisabled,
        },
        newAssignments: unit.newAssignments.map(a => {
          let assignmentComplete = true;
          const assignment = {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            unitId: this.uuidService.binToUUID(a.unitId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            optional: a.optional,
            newParts: a.newParts.map(p => {
              let partComplete = true;
              const part = {
                partId: this.uuidService.binToUUID(p.partId),
                assignmentId: this.uuidService.binToUUID(p.assignmentId),
                partNumber: p.partNumber,
                title: p.title,
                description: p.description,
                optional: p.optional,
                newTextBoxes: p.newTextBoxes.map(t => {
                  const textBoxComplete = t.text.length > 0;
                  if (!t.optional && !textBoxComplete) {
                    partComplete = false;
                  }
                  return {
                    textBoxId: this.uuidService.binToUUID(t.textBoxId),
                    partId: this.uuidService.binToUUID(t.partId),
                    description: t.description,
                    lines: t.lines,
                    points: t.points,
                    mark: t.mark,
                    optional: t.optional,
                    order: t.order,
                    text: t.text,
                    complete: textBoxComplete,
                  };
                }),
                newUploadSlots: p.newUploadSlots.map(u => {
                  const uploadSlotComplete = u.filename !== null;
                  if (!u.optional && !uploadSlotComplete) {
                    partComplete = false;
                  }
                  return {
                    uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                    partId: this.uuidService.binToUUID(u.partId),
                    label: u.label,
                    allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                    points: u.points,
                    mark: u.mark,
                    optional: u.optional,
                    order: u.order,
                    filename: u.filename,
                    size: u.size,
                    mimeTypeId: u.mimeTypeId,
                    complete: uploadSlotComplete,
                  };
                }),
                complete: partComplete,
              };
              if (!p.optional && !partComplete) {
                assignmentComplete = false;
              }
              return part;
            }),
            complete: assignmentComplete,
          };
          if (!a.optional && !assignmentComplete) {
            unitComplete = false;
          }
          return assignment;
        }),
        complete: unitComplete,
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
