import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewAssignmentTemplateRequestDTO = {
  assignmentId: string;
};

export type DeleteNewAssignmentTemplateResponseDTO = void;

export class DeleteNewAssignmentTemplateNotFound extends Error { }
export class DeleteNewAssignmentTemplateSubmissionsEnabled extends Error { }

export class DeleteNewAssignmentTemplateInteractor implements IInteractor<DeleteNewAssignmentTemplateRequestDTO, DeleteNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ assignmentId }: DeleteNewAssignmentTemplateRequestDTO): Promise<ResultType<DeleteNewAssignmentTemplateResponseDTO>> {
    try {
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin },
        include: {
          newAssignmentMedia: { include: { newAssignments: true } },
          newPartTemplates: { include: { newPartMedia: { include: { newParts: true } } } },
          newSubmissionTemplate: { include: { course: true } },
        },
      });
      if (!assignmentTemplate) {
        return Result.fail(new DeleteNewAssignmentTemplateNotFound());
      }

      if (assignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new DeleteNewAssignmentTemplateSubmissionsEnabled());
      }

      // delete the assignment template
      await this.prisma.newAssignmentTemplate.delete({ where: { assignmentTemplateId: assignmentIdBin } });

      // delete any assignment medium that's not currently linked to any assignments
      for (const assignmentMedium of assignmentTemplate.newAssignmentMedia) {
        if (assignmentMedium.newAssignments.length === 0) {
          if (assignmentMedium.externalData === null) {
            const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(assignmentMedium.assignmentMediumId)}`;
            try {
              await this.prisma.$transaction(async transaction => {
                await transaction.newAssignmentMedium.delete({
                  where: { assignmentMediumId: assignmentMedium.assignmentMediumId },
                });
                await this.fileService.unlink(filePath);
              });
            } catch (err) {
              this.logger.error(`Could not unlink file ${filePath}`);
              // swallow the error and continue
              // we might be left with orphaned files, but that's acceptable
            }
          } else {
            await this.prisma.newAssignmentMedium.delete({
              where: { assignmentMediumId: assignmentMedium.assignmentMediumId },
            });
          }
        }
      }
      // delete any part media that's not currently linked to any parts
      for (const partTemplate of assignmentTemplate.newPartTemplates) {
        for (const partMedium of partTemplate.newPartMedia) {
          if (partMedium.newParts.length === 0) {
            if (partMedium.externalData === null) {
              const filePath = `${this.configService.config.paths.partMediaPath}/${this.uuidService.binToUUID(partMedium.partMediumId)}`;
              try {
                await this.prisma.$transaction(async transaction => {
                  await transaction.newPartMedium.delete({
                    where: { partMediumId: partMedium.partMediumId },
                  });
                  await this.fileService.unlink(filePath);
                });
              } catch (err) {
                this.logger.error(`Could not unlink file ${filePath}`);
                // swallow the error and continue
                // we might be left with orphaned files, but that's acceptable
              }
            } else {
              await this.prisma.newPartMedium.delete({
                where: { partMediumId: partMedium.partMediumId },
              });
            }
          }
        }
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
