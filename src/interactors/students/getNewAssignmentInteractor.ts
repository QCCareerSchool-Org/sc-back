import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewAssignmentRequestDTO = {
  studentId: number;
  enrollmentId: number;
  unitId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = {
  /** hex string */
  assignmentId: string;
  /** hex string */
  unitId: string;
  assignment: number;
  title: string | null;
  description: string | null;
  optional: boolean;
  parts: Array<{
    /** hex string */
    partId: string;
    textBoxes: Array<{
      /** hex string */
      textBoxId: string;
      description: string | null;
      lines: number | null;
      optional: boolean;
    }>;
    uploadSlots: Array<{
      /** hex string */
      uploadSlotId: string;
      label: string;
      optional: boolean;
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

  public async execute({ studentId, enrollmentId, unitId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const assignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          unitId: this.uuidService.uuidToBin(unitId),
          unit: {
            enrollmentId,
            enrollment: { studentId },
          },
        },
        include: {
          parts: {
            orderBy: { part: 'asc' },
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
        assignment: assignment.assignment,
        title: assignment.title,
        description: assignment.description,
        optional: assignment.optional,
        parts: assignment.parts.map(p => ({
          partId: this.uuidService.binToUUID(p.partId),
          textBoxes: p.textBoxes.map(t => ({
            textBoxId: this.uuidService.binToUUID(t.textBoxId),
            description: t.description,
            lines: t.lines,
            optional: t.optional,
          })),
          uploadSlots: p.uploadSlots.map(u => ({
            uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
            label: u.label,
            optional: u.optional,
          })),
        })),
      });

    } catch (err) {
      this.logger.error('error getting new units', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
