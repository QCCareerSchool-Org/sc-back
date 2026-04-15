import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type DeleteNewPartTemplateRequestDTO = {
  partId: string;
};

export type DeleteNewPartTemplateResponseDTO = void;

export class DeleteNewPartTemplateNotFound extends Error { }
export class DeleteNewPartTemplateSubmissionsEnabled extends Error { }

export class DeleteNewPartTemplateInteractor implements IInteractor<DeleteNewPartTemplateRequestDTO, DeleteNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ partId }: DeleteNewPartTemplateRequestDTO): Promise<ResultType<DeleteNewPartTemplateResponseDTO>> {
    try {
      const partIdBin = this.uuidService.uuidToBin(partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: {
          newPartMedia: { include: { newParts: true } },
          newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return failure(new DeleteNewPartTemplateNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new DeleteNewPartTemplateSubmissionsEnabled());
      }

      // delete the part template
      await this.prisma.newPartTemplate.delete({ where: { partTemplateId: partIdBin } });

      // delete any part media that's not currently linked to any parts
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

      return success(undefined);

    } catch (err) {
      this.logger.error('error deleting part template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
