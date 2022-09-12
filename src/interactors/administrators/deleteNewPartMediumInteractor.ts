import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewPartMediumRequestDTO = {
  mediumId: string;
};

export type DeleteNewPartMediumResponseDTO = void;

export class DeleteNewPartMediumNotFound extends Error { }
export class DeleteNewPartMediumSubmissionsEnabled extends Error { }
export class DeleteNewPartMediumUnlinkError extends Error { }

export class DeleteNewPartMediumInteractor implements IInteractor<DeleteNewPartMediumRequestDTO, DeleteNewPartMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ mediumId }: DeleteNewPartMediumRequestDTO): Promise<ResultType<DeleteNewPartMediumResponseDTO>> {
    try {
      const mediumIdBin = this.uuidService.uuidToBin(mediumId);

      // find the assignment medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin },
        include: {
          newParts: true,
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } } },
        },
      });
      if (!partMedium) {
        return Result.fail(new DeleteNewPartMediumNotFound());
      }

      if (partMedium.newPartTemplate?.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new DeleteNewPartMediumSubmissionsEnabled());
      }

      if (partMedium.newParts.length > 0) {
        // there are linked parts
        // update the medium to remove the relation to the part template
        await this.prisma.newPartMedium.update({
          data: { partTemplateId: null },
          where: { partMediumId: mediumIdBin },
        });
      } else {
        // no assignments are using this medium
        // delete the medium
        if (partMedium.externalData === null) {
          const filePath = `${this.configService.config.paths.partMediaPath}/${mediumId}`;
          await this.prisma.$transaction(async transaction => {
            await transaction.newPartMedium.delete({
              where: { partMediumId: mediumIdBin },
            });
            try {
              await this.fileService.unlink(filePath);
            } catch (err) {
              this.logger.error('Could not delete file', err);
              throw new DeleteNewPartMediumUnlinkError();
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
      this.logger.error('error deleting part medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
