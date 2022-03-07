import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewTextBoxTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
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

  public async execute({ schoolId, courseId, unitId, assignmentId, partId, textBoxId }: GetNewTextBoxTemplateRequestDTO): Promise<ResultType<GetNewTextBoxTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const textBoxIdBin = this.uuidService.uuidToBin(textBoxId);

      const textBox = await this.prisma.newTextBoxTemplate.findFirst({
        where: { textBoxId: textBoxIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, course: { courseId, schoolId } } } } },
        include: { newPart: true },
      });
      if (!textBox) {
        return Result.fail(new GetNewTextBoxTemplateNotFound());
      }

      return Result.success({
        textBoxId: this.uuidService.binToUUID(textBox.textBoxId),
        partId: this.uuidService.binToUUID(textBox.partId),
        description: textBox.description,
        lines: textBox.lines,
        points: textBox.points,
        optional: textBox.optional,
        order: textBox.order,
        created: textBox.created,
        modified: textBox.modified,
        newPartTemplate: {
          partId: this.uuidService.binToUUID(textBox.newPart.partId),
          assignmentId: this.uuidService.binToUUID(textBox.newPart.assignmentId),
          partNumber: textBox.newPart.partNumber,
          title: textBox.newPart.title,
          description: textBox.newPart.description,
          optional: textBox.newPart.optional,
          created: textBox.newPart.created,
          modified: textBox.newPart.modified,
        },
      });

    } catch (err) {
      this.logger.error('error getting text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
