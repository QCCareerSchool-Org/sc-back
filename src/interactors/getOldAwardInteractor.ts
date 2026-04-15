import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { AwardDTO } from '../domain/awardDTO.js';
import type { IGradeService } from '../services/grade/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IUUIDService } from '../services/uuid/index.js';
import type { IInteractor } from './index.js';

export type GetOldAwardRequestDTO = {
  submissionId: number;
};

export type GetOldAwardResponseDTO = AwardDTO;

export abstract class GetOldAwardError extends Error { }
export class GetOldAwardNotFound extends GetOldAwardError { }
export class GetOldAwardNotMarked extends GetOldAwardError { }
export class GetOldAwardNoPoints extends GetOldAwardError { }
export class GetOldAwardGradeTooLow extends GetOldAwardError { }

export class GetOldAwardInteractor implements IInteractor<GetOldAwardRequestDTO, GetOldAwardResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly gradeService: IGradeService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionId }: GetOldAwardRequestDTO): Promise<ResultType<GetOldAwardResponseDTO>> {
    try {
      const oldSubmission = await this.prisma.oldSubmission.findFirst({
        where: { submissionId },
        include: {
          enrollment: { include: { student: true, course: { include: { school: true } } } },
          quizzes: true,
        },
      });

      if (!oldSubmission) {
        return failure(new GetOldAwardNotFound());
      }

      if (oldSubmission.mark === null || oldSubmission.points === null) {
        return failure(new GetOldAwardNotMarked());
      }

      let quizMarks = 0;
      let quizPoints = 0;

      for (const quiz of oldSubmission.quizzes) {
        if (quiz.mark !== null) {
          quizMarks += quiz.mark * parseFloat(quiz.weight.toFixed(2));
          quizPoints += quiz.points * parseFloat(quiz.weight.toFixed(2));
        }
      }

      const totalMarks = oldSubmission.mark + quizMarks;
      const totalPoints = oldSubmission.points + quizPoints;

      if (totalPoints === 0) {
        return failure(new GetOldAwardNoPoints());
      }

      const grade = this.gradeService.calculate(totalMarks / totalPoints);

      if (!(grade === 'A-' || grade === 'A' || grade === 'A+')) {
        return failure(new GetOldAwardGradeTooLow());
      }

      return success({
        submissionId: oldSubmission.submissionId,
        courseName: oldSubmission.enrollment.course.name,
        schoolName: oldSubmission.enrollment.course.school.name,
        unitLetter: oldSubmission.unitLetter,
        grade: this.gradeService.calculate(totalMarks / totalPoints),
        name: `${oldSubmission.enrollment.student.firstName} ${oldSubmission.enrollment.student.lastName}`,
        created: oldSubmission.markedDate ?? oldSubmission.finalizedDate ?? oldSubmission.creationDate,
      });

    } catch (err) {
      this.logger.error('error getting award', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
