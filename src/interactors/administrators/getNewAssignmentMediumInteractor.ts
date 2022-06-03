import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentDTO } from '../../domain/newAssignmentDTO.js';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewAssignmentMediumRequestDTO = {
  mediumId: string;
};

export type GetNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO & {
  newAssignmentTemplate: NewAssignmentTemplateDTO | null;
  newAssignments: Omit<NewAssignmentDTO, 'complete' | 'points' | 'mark'>[];
};

export class GetNewAssignmentMediumNotFound extends Error { }

export class GetNewAssignmentMediumInteractor implements IInteractor<GetNewAssignmentMediumRequestDTO, GetNewAssignmentMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ mediumId }: GetNewAssignmentMediumRequestDTO): Promise<ResultType<GetNewAssignmentMediumResponseDTO>> {
    try {
      const mediumIdBin = this.uuidService.uuidToBin(mediumId);

      // find the assignment medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: { assignmentMediumId: mediumIdBin },
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
        filesize: assignmentMedium.filesize,
        caption: assignmentMedium.caption,
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
          markingCriteria: assignmentMedium.newAssignmentTemplate.markingCriteria,
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
          markingCriteria: a.newAssignment.markingCriteria,
          optional: a.newAssignment.optional,
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
