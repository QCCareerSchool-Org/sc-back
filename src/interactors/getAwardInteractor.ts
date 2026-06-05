import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { AwardDTO } from '../domain/awardDTO.js';
import type { IGradeService } from '../services/grade/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IUUIDService } from '../services/uuid/index.js';
import type { IInteractor } from './index.js';

export type GetAwardRequestDTO = {
  submissionId: string;
};

export type GetAwardResponseDTO = AwardDTO;

export abstract class GetAwardError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
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
        return failure(new GetAwardNotFound());
      }

      if (submission.closed === null) {
        return failure(new GetAwardNotMarked());
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
        return failure(new GetAwardNoPoints());
      }

      const grade = this.gradeService.calculate(totalMarks / totalPoints);

      if (!(grade === 'A-' || grade === 'A' || grade === 'A+')) {
        return failure(new GetAwardGradeTooLow());
      }

      return success({
        submissionId: this.uuidService.binToUUID(submission.submissionId),
        courseName: submission.enrollment.course.name,
        schoolName: submission.enrollment.course.school.name,
        unitLetter: submission.unitLetter,
        grade: this.gradeService.calculate(totalMarks / totalPoints),
        name: `${submission.enrollment.student.firstName} ${submission.enrollment.student.lastName}`,
        created: submission.closed,
        designation: submission.title ?? submission.enrollment.course.name,
      });

    } catch (err) {
      this.logger.error('error getting award', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
