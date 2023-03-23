import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewAssignmentMediumRequestDTO = {
  mediumId: string;
};

export type DeleteNewAssignmentMediumResponseDTO = void;

export class DeleteNewAssignmentMediumNotFound extends Error { }
export class DeleteNewAssignmentMediumSubmissionsEnabled extends Error { }
export class DeleteNewAssignmentMediumUnlinkError extends Error { }

export class DeleteNewAssignmentMediumInteractor implements IInteractor<DeleteNewAssignmentMediumRequestDTO, DeleteNewAssignmentMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ mediumId }: DeleteNewAssignmentMediumRequestDTO): Promise<ResultType<DeleteNewAssignmentMediumResponseDTO>> {
    try {
      const mediumIdBin = this.uuidService.uuidToBin(mediumId);

      // find the assignment medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: { assignmentMediumId: mediumIdBin },
        include: {
          newAssignments: true,
          newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } },
        },
      });
      if (!assignmentMedium) {
        return Result.fail(new DeleteNewAssignmentMediumNotFound());
      }

      if (assignmentMedium.newAssignmentTemplate?.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new DeleteNewAssignmentMediumSubmissionsEnabled());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      if (assignmentMedium.newAssignments.length > 0) {
        // there are linked assignments
        // update the medium to remove the relation to the assignment template
        await this.prisma.newAssignmentMedium.update({
          data: { assignmentTemplateId: null, modified: prismaNow },
          where: { assignmentMediumId: mediumIdBin },
        });
      } else {
        // no assignments are using this medium
        // delete the medium
        if (assignmentMedium.externalData === null) {
          const filePath = `${this.configService.config.paths.assignmentMediaPath}/${mediumId}`;
          await this.prisma.$transaction(async transaction => {
            await transaction.newAssignmentMedium.delete({
              where: { assignmentMediumId: mediumIdBin },
            });
            try {
              await this.fileService.unlink(filePath);
            } catch (err) {
              this.logger.error('Could not delete file', err);
              throw new DeleteNewAssignmentMediumUnlinkError();
            }
          });
        } else {
          await this.prisma.newAssignmentMedium.delete({
            where: { assignmentMediumId: mediumIdBin },
          });
        }
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting assignment medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
