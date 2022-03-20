import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentDTO } from '../../domain/newAssignmentDTO';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetNewAssignmentMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  mediumId: string;
};

export type GetNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO & {
  newAssignmentTemplate: NewAssignmentTemplateDTO | null;
  newAssignments: NewAssignmentDTO[];
};

export class GetNewAssignmentMediumNotFound extends Error { }

export class GetNewAssignmentMediumInteractor implements IInteractor<GetNewAssignmentMediumRequestDTO, GetNewAssignmentMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetNewAssignmentMediumRequestDTO): Promise<ResultType<GetNewAssignmentMediumResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the assignment medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: { assignmentMediumId: mediumIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
        include: {
          newAssignmentTemplate: true,
          newAssignments: { include: { newAssignment: true } },
        },
      });
      if (!assignmentMedium) {
        return Result.fail(new GetNewAssignmentMediumNotFound());
      }

      return Result.success({
        assignmentMediumId: this.uuidService.binToUUID(assignmentMedium.assignmentMediumId),
        assignmentTemplateId: assignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(assignmentMedium.assignmentTemplateId),
        mimeTypeId: assignmentMedium.mimeTypeId,
        type: assignmentMedium.type,
        filename: assignmentMedium.filename,
        caption: assignmentMedium.caption,
        size: assignmentMedium.size,
        order: assignmentMedium.order,
        externalData: assignmentMedium.externalData,
        created: assignmentMedium.created,
        modified: assignmentMedium.modified,
        newAssignmentTemplate: assignmentMedium.newAssignmentTemplate === null ? null : {
          assignmentTemplateId: this.uuidService.binToUUID(assignmentMedium.newAssignmentTemplate.assignmentTemplateId),
          unitTemplateId: this.uuidService.binToUUID(assignmentMedium.newAssignmentTemplate.unitTemplateId),
          assignmentNumber: assignmentMedium.newAssignmentTemplate.assignmentNumber,
          title: assignmentMedium.newAssignmentTemplate.title,
          description: assignmentMedium.newAssignmentTemplate.description,
          optional: assignmentMedium.newAssignmentTemplate.optional,
          created: assignmentMedium.newAssignmentTemplate.created,
          modified: assignmentMedium.newAssignmentTemplate.modified,
        },
        newAssignments: assignmentMedium.newAssignments.map(a => ({
          assignmentId: this.uuidService.binToUUID(a.newAssignment.assignmentId),
          unitId: this.uuidService.binToUUID(a.newAssignment.unitId),
          assignmentNumber: a.newAssignment.assignmentNumber,
          title: a.newAssignment.title,
          description: a.newAssignment.description,
          optional: a.newAssignment.optional,
          complete: a.newAssignment.complete,
          points: a.newAssignment.points,
          mark: a.newAssignment.mark,
          created: a.newAssignment.created,
          modified: a.newAssignment.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting assignment medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
