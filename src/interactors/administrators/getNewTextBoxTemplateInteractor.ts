import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetNewTextBoxTemplateRequestDTO = {
  textBoxId: string;
};

export type GetNewTextBoxTemplateResponseDTO = NewTextBoxTemplateDTO & {
  newPartTemplate: NewPartTemplateDTO;
};

export class GetNewTextBoxTemplateNotFound extends Error { }

export class GetNewTextBoxTemplateInteractor implements IInteractor<GetNewTextBoxTemplateRequestDTO, GetNewTextBoxTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ textBoxId }: GetNewTextBoxTemplateRequestDTO): Promise<ResultType<GetNewTextBoxTemplateResponseDTO>> {
    try {
      const textBoxIdBin = this.uuidService.uuidToBin(textBoxId);

      // find the text box template
      const textBoxTemplate = await this.prisma.newTextBoxTemplate.findFirst({
        where: { textBoxTemplateId: textBoxIdBin },
        include: { newPartTemplate: true },
      });
      if (!textBoxTemplate) {
        return Result.fail(new GetNewTextBoxTemplateNotFound());
      }

      return Result.success({
        textBoxTemplateId: this.uuidService.binToUUID(textBoxTemplate.textBoxTemplateId),
        partTemplateId: this.uuidService.binToUUID(textBoxTemplate.partTemplateId),
        description: textBoxTemplate.description,
        lines: textBoxTemplate.lines,
        points: textBoxTemplate.points,
        optional: textBoxTemplate.optional,
        order: textBoxTemplate.order,
        created: textBoxTemplate.created,
        modified: textBoxTemplate.modified,
        newPartTemplate: {
          partTemplateId: this.uuidService.binToUUID(textBoxTemplate.newPartTemplate.partTemplateId),
          assignmentTemplateId: this.uuidService.binToUUID(textBoxTemplate.newPartTemplate.assignmentTemplateId),
          partNumber: textBoxTemplate.newPartTemplate.partNumber,
          title: textBoxTemplate.newPartTemplate.title,
          description: textBoxTemplate.newPartTemplate.description,
          descriptionType: textBoxTemplate.newPartTemplate.descriptionType,
          markingCriteria: textBoxTemplate.newPartTemplate.markingCriteria,
          created: textBoxTemplate.newPartTemplate.created,
          modified: textBoxTemplate.newPartTemplate.modified,
        },
      });

    } catch (err) {
      this.logger.error('error getting text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
