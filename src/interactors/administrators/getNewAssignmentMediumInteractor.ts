import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewAssignmentDTO } from '../../domain/administrators/newAssignmentDTO.js';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type GetNewAssignmentMediumRequestDTO = {
  mediumId: string;
};

export type GetNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO & {
  newAssignmentTemplate: NewAssignmentTemplateDTO | null;
  newAssignments: Omit<NewAssignmentDTO, 'complete' | 'points' | 'mark' | 'markOverride'>[];
};

export class GetNewAssignmentMediumNotFound extends Error { }

export class GetNewAssignmentMediumInteractor implements IInteractor<GetNewAssignmentMediumRequestDTO, GetNewAssignmentMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
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
        return failure(new GetNewAssignmentMediumNotFound());
      }

      return success({
        assignmentMediumId: this.uuidService.binToUUID(assignmentMedium.assignmentMediumId),
        assignmentTemplateId: assignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(assignmentMedium.assignmentTemplateId),
        mimeTypeId: assignmentMedium.mimeTypeId,
        type: assignmentMedium.type,
        filename: assignmentMedium.filename,
        filesize: assignmentMedium.filesize,
        caption: assignmentMedium.caption,
        order: assignmentMedium.order,
        externalData: assignmentMedium.externalData,
        created: this.dateService.fixPrismaReadDate(assignmentMedium.created),
        modified: this.dateService.fixPrismaReadDate(assignmentMedium.modified),
        newAssignmentTemplate: assignmentMedium.newAssignmentTemplate === null ? null : {
          assignmentTemplateId: this.uuidService.binToUUID(assignmentMedium.newAssignmentTemplate.assignmentTemplateId),
          submissionTemplateId: this.uuidService.binToUUID(assignmentMedium.newAssignmentTemplate.submissionTemplateId),
          assignmentNumber: assignmentMedium.newAssignmentTemplate.assignmentNumber,
          title: assignmentMedium.newAssignmentTemplate.title,
          description: assignmentMedium.newAssignmentTemplate.description,
          descriptionType: assignmentMedium.newAssignmentTemplate.descriptionType,
          markingCriteria: assignmentMedium.newAssignmentTemplate.markingCriteria,
          optional: assignmentMedium.newAssignmentTemplate.optional,
          created: this.dateService.fixPrismaReadDate(assignmentMedium.newAssignmentTemplate.created),
          modified: this.dateService.fixPrismaReadDate(assignmentMedium.newAssignmentTemplate.modified),
        },
        newAssignments: assignmentMedium.newAssignments.map(a => ({
          assignmentId: this.uuidService.binToUUID(a.newAssignment.assignmentId),
          submissionId: this.uuidService.binToUUID(a.newAssignment.submissionId),
          assignmentNumber: a.newAssignment.assignmentNumber,
          title: a.newAssignment.title,
          description: a.newAssignment.description,
          descriptionType: a.newAssignment.descriptionType,
          markingCriteria: a.newAssignment.markingCriteria,
          optional: a.newAssignment.optional,
          created: this.dateService.fixPrismaReadDate(a.newAssignment.created),
          modified: this.dateService.fixPrismaReadDate(a.newAssignment.modified),
        })),
      });

    } catch (err) {
      this.logger.error('error getting assignment medium', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
