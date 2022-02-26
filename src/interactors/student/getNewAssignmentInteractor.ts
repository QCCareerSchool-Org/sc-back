import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewAssignmentRequestDTO = {
  studentId: number;
  unitId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = {
  /** uuid */
  assignmentId: string;
  /** uuid */
  unitId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
  created: Date;
  parts: Array<{
    /** uuid */
    partId: string;
    /** uuid */
    assignmentId: string;
    partNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
    complete: boolean;
    textBoxes: Array<{
      /** uuid */
      textBoxId: string;
      /** uuid */
      partId: string;
      description: string | null;
      lines: number | null;
      optional: boolean;
      order: number;
      text: string;
      complete: boolean;
    }>;
    uploadSlots: Array<{
      /** uuid */
      uploadSlotId: string;
      /** uuid */
      partId: string;
      label: string;
      allowedTypes: string[];
      optional: boolean;
      order: number;
      filename: string | null;
      size: number | null;
      mimeTypeId: string | null;
      complete: boolean;
    }>;
  }>;
};

export class GetNewAssignmentNotFound extends Error { }

export class GetNewAssignmentInteractor implements IInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, unitId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const assignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          unitId: this.uuidService.uuidToBin(unitId),
          unit: { enrollment: { studentId } },
        },
        include: {
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

      return Result.success({
        assignmentId: this.uuidService.binToUUID(assignment.assignmentId),
        unitId: this.uuidService.binToUUID(assignment.unitId),
        assignmentNumber: assignment.assignmentNumber,
        title: assignment.title,
        description: assignment.description,
        optional: assignment.optional,
        complete: assignment.complete,
        created: assignment.created,
        parts: assignment.parts.map(p => ({
          partId: this.uuidService.binToUUID(p.partId),
          assignmentId: this.uuidService.binToUUID(p.assignmentId),
          partNumber: p.partNumber,
          title: p.title,
          description: p.description,
          optional: p.optional,
          complete: p.complete,
          textBoxes: p.textBoxes.map(t => ({
            textBoxId: this.uuidService.binToUUID(t.textBoxId),
            partId: this.uuidService.binToUUID(t.partId),
            description: t.description,
            lines: t.lines,
            optional: t.optional,
            order: t.order,
            text: t.text,
            complete: t.complete,
          })),
          uploadSlots: p.uploadSlots.map(u => ({
            uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
            partId: this.uuidService.binToUUID(u.partId),
            label: u.label,
            allowedTypes: u.allowedTypes.split(','),
            optional: u.optional,
            order: u.order,
            filename: u.filename,
            size: u.size,
            mimeTypeId: u.mimeTypeId,
            complete: u.complete,
          })),
        })),
      });

    } catch (err) {
      this.logger.error('error getting new assignment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
