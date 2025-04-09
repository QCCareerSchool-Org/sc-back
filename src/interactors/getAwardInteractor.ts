import type { PrismaClient } from '@prisma/client';

import type { AwardDTO } from '../domain/awardDTO.js';
import type { IGradeService } from '../services/grade/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IUUIDService } from '../services/uuid/index.js';
import type { ResultType } from './result.js';
import { Result } from './result.js';
import type { IInteractor } from './index.js';

export type GetAwardRequestDTO = {
  submissionId: string;
};

export type GetAwardResponseDTO = AwardDTO;

export abstract class GetAwardError extends Error {}
export class GetAwardNotFound extends GetAwardError { }
export class GetAwardNotMarked extends GetAwardError { }
export class GetAwardNoPoints extends GetAwardError { }
export class GetAwardGradeTooLow extends GetAwardError { }

export class GetAwardInteractor implements IInteractor<GetAwardRequestDTO, GetAwardResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly gradeService: IGradeService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionId }: GetAwardRequestDTO): Promise<ResultType<GetAwardResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const submission = await this.prisma.newSubmission.findFirst({
        where: { submissionId: submissionIdBin },
        include: {
          enrollment: { include: { student: true, course: { include: { school: true } } } },
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
        },
      });

      if (!submission) {
        return Result.fail(new GetAwardNotFound());
      }

      if (submission.closed === null) {
        return Result.fail(new GetAwardNotMarked());
      }

      let totalMarks = 0;
      let totalPoints = 0;

      for (const assignment of submission.newAssignments) {
        for (const part of assignment.newParts) {
          for (const textBox of part.newTextBoxes) {
            const mark = textBox.markOverride ?? textBox.mark;
            if (mark !== null) {
              totalMarks += mark;
              totalPoints += textBox.points;
            }
          }
          for (const uploadSlot of part.newUploadSlots) {
            const mark = uploadSlot.markOverride ?? uploadSlot.mark;
            if (mark !== null) {
              totalMarks += mark;
              totalPoints += uploadSlot.points;
            }
          }
        }
      }

      if (totalPoints === 0) {
        return Result.fail(new GetAwardNoPoints());
      }

      const grade = this.gradeService.calculate(totalMarks / totalPoints);

      if (!(grade === 'A-' || grade === 'A' || grade === 'A+')) {
        return Result.fail(new GetAwardGradeTooLow());
      }

      return Result.success({
        submissionId: this.uuidService.binToUUID(submission.submissionId),
        courseName: submission.enrollment.course.name,
        schoolName: submission.enrollment.course.school.name,
        name: `${submission.enrollment.student.firstName} ${submission.enrollment.student.lastName}`,
        grade: this.gradeService.calculate(totalMarks / totalPoints),
        created: submission.closed,
      });

    } catch (err) {
      this.logger.error('error getting award', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
