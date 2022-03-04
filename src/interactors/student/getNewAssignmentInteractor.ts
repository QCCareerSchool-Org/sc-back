import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import { NewAssignmentDTO } from '../../domain/student/newAssignmentDTO';
import { NewPartDTO } from '../../domain/student/newPartDTO';
import { NewTextBoxDTO } from '../../domain/student/newTextBoxDTO';
import { NewUploadSlotDTO } from '../../domain/student/newUploadSlotDTO';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewAssignmentRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = NewAssignmentDTO & {
  parts: Array<NewPartDTO & {
    textBoxes: NewTextBoxDTO[];
    uploadSlots: NewUploadSlotDTO[];
  }>;
};

export class GetNewAssignmentNotFound extends Error { }

export class GetNewAssignmentInteractor implements IInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const assignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          unitId: this.uuidService.uuidToBin(unitId),
          unit: { enrollment: { studentId, courseId, course: { enabled: true } } },
        },
        include: {
          unit: true,
          parts: {
            orderBy: { partNumber: 'asc' },
            include: {
              textBoxes: { orderBy: { order: 'asc' } },
              uploadSlots: { orderBy: { order: 'asc' } },
            },
          },
        },
      });

      if (!assignment) {
        return Result.fail(new GetNewAssignmentNotFound());
      }

      let assignmentComplete = true;

      return Result.success({
        assignmentId: this.uuidService.binToUUID(assignment.assignmentId),
        unitId: this.uuidService.binToUUID(assignment.unitId),
        assignmentNumber: assignment.assignmentNumber,
        title: assignment.title,
        description: assignment.description,
        optional: assignment.optional,
        created: assignment.created,
        parts: assignment.parts.map(p => {
          let partComplete = true;
          const part = {
            partId: this.uuidService.binToUUID(p.partId),
            assignmentId: this.uuidService.binToUUID(p.assignmentId),
            partNumber: p.partNumber,
            title: p.title,
            description: p.description,
            optional: p.optional,
            textBoxes: p.textBoxes.map(t => {
              const textBoxComplete = t.text.length > 0;
              if (!textBoxComplete) {
                partComplete = false;
              }
              return {
                textBoxId: this.uuidService.binToUUID(t.textBoxId),
                partId: this.uuidService.binToUUID(t.partId),
                description: t.description,
                lines: t.lines,
                points: t.points,
                mark: assignment.unit.marked ? t.mark : null, // hide mark unless the unit is marked
                optional: t.optional,
                order: t.order,
                text: t.text,
                complete: textBoxComplete,
              };
            }),
            uploadSlots: p.uploadSlots.map(u => {
              const uploadSlotComplete = u.filename !== null;
              if (!uploadSlotComplete) {
                partComplete = false;
              }
              return {
                uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                partId: this.uuidService.binToUUID(u.partId),
                label: u.label,
                allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                points: u.points,
                mark: assignment.unit.marked ? u.mark : null, // hide mark unless the unit is marked
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
          if (!partComplete) {
            assignmentComplete = false;
          }
          return part;
        }),
        complete: assignmentComplete,
      });

    } catch (err) {
      this.logger.error('error getting new assignment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
