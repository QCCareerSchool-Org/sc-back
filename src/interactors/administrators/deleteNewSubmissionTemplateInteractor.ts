import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type DeleteNewSubmissionTemplateRequestDTO = {
  submissionId: string;
};

export type DeleteNewSubmissionTemplateResponseDTO = void;

export class DeleteNewSubmissionTemplateNotFound extends Error { }
export class DeleteNewSubmissionTemplateSubmissionsEnabled extends Error { }

export class DeleteNewSubmissionTemplateInteractor implements IInteractor<DeleteNewSubmissionTemplateRequestDTO, DeleteNewSubmissionTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionId }: DeleteNewSubmissionTemplateRequestDTO): Promise<ResultType<DeleteNewSubmissionTemplateResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      // find the submission template
      const submissionTemplate = await this.prisma.newSubmissionTemplate.findFirst({
        where: { submissionTemplateId: submissionIdBin },
        include: {
          newAssignmentTemplates: { include: {
            newAssignmentMedia: { include: { newAssignments: true } },
            newPartTemplates: { include: { newPartMedia: { include: { newParts: true } } } },
          } },
          course: true,
        },
      });
      if (!submissionTemplate) {
        return failure(new DeleteNewSubmissionTemplateNotFound());
      }

      if (submissionTemplate.course.submissionsEnabled) {
        return failure(new DeleteNewSubmissionTemplateSubmissionsEnabled());
      }

      // delete the submission template
      await this.prisma.newSubmissionTemplate.delete({ where: { submissionTemplateId: submissionIdBin } });

      // delete any assignment medium that's not currently linked to any assignments
      for (const assignmentTemplate of submissionTemplate.newAssignmentTemplates) {
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
        // delete any part medium that's not currently linked to any parts
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
      }

      return success(undefined);

    } catch (err) {
      this.logger.error('error deleting submission template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
