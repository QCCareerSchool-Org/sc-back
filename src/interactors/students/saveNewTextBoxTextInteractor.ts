import type { PrismaClient } from '@prisma/client';

import type { NewTextBoxDTO } from '../../domain/students/newTextBoxDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type SaveNewTextBoxTextRequestDTO = {
  studentId: number;
  courseId: number;
  /** uuid */
  submissionId: string;
  /** uuid */
  assignmentId: string;
  /** uuid */
  partId: string;
  /** uuid */
  textBoxId: string;
  text: string;
};

export type SaveNewTextBoxTextResponseDTO = NewTextBoxDTO;

export class SaveNewTextBoxTextNotFound extends Error { }
export class SaveNewTextBoxTextSubmissionSubmitted extends Error { }
export class SaveNewTextBoxTextTooLong extends Error { }

/**
 * Should consider mark overrides.
 */
export class SaveNewTextBoxTextInteractor extends StudentInteractor<SaveNewTextBoxTextRequestDTO, SaveNewTextBoxTextResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, submissionId, assignmentId, partId, textBoxId, text }: SaveNewTextBoxTextRequestDTO): Promise<ResultType<SaveNewTextBoxTextResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const textBoxIdBin = this.uuidService.uuidToBin(textBoxId);

      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: { student: true },
      });

      this.checkEnrollment(enrollment);

      const newTextBox = await this.prisma.newTextBox.findFirst({
        where: { textBoxId: textBoxIdBin, newPart: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newSubmission: { submissionId: submissionIdBin, enrollment: { studentId, courseId } } } } },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
      });
      if (!newTextBox) {
        throw new SaveNewTextBoxTextNotFound();
      }

      if (newTextBox.newPart.newAssignment.newSubmission.submitted) {
        throw new SaveNewTextBoxTextSubmissionSubmitted();
      }

      const maxLength = 65_535;
      const length = [ ...text ].length;
      if (length > maxLength) {
        throw new SaveNewTextBoxTextTooLong();
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const updatedTextBox = await this.prisma.newTextBox.update({
        data: { text, modified: prismaNow },
        where: { textBoxId: textBoxIdBin },
        include: { newPart: { include: { newAssignment: { include: { newSubmission: true } } } } },
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        points: updatedTextBox.points,
        mark: updatedTextBox.newPart.newAssignment.newSubmission.closed ? updatedTextBox.markOverride ?? updatedTextBox.mark : null, // hide mark unless the submission is marked
        notes: null,
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        text: updatedTextBox.text,
        complete: updatedTextBox.text.length > 0,
        created: this.dateService.fixPrismaReadDate(updatedTextBox.created),
        modified: this.dateService.fixPrismaReadDate(updatedTextBox.modified),
      });

    } catch (err) {
      this.logger.error('error saving text box text', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
