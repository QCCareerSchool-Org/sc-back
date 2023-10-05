import type { PrismaClient } from '@prisma/client';
import type { SurveyCompletionDTO } from '../domain/surveyCompletionDTO.js';
import type { IDateService } from '../services/date/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IUUIDService } from '../services/uuid/index.js';
import type { ResultType } from './result.js';
import { Result } from './result.js';
import type { IInteractor } from './index.js';

export type InsertSurveyCompletionRequestDTO = {
  /** uuid */
  surveyId: string;
  studentId: number;
};

export type InsertSurveyCompletionResponseDTO = SurveyCompletionDTO;

export class InsertSurveyCompletionSurveyNotFound extends Error { }
export class InsertSurveyCompletionStudentNotFound extends Error { }

export class InsertSurveyCompletionInteractor implements IInteractor<InsertSurveyCompletionRequestDTO, InsertSurveyCompletionResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ surveyId, studentId }: InsertSurveyCompletionRequestDTO): Promise<ResultType<InsertSurveyCompletionResponseDTO>> {
    try {
      const surveyIdBin = this.uuidService.uuidToBin(surveyId);

      const survey = await this.prisma.survey.findFirst({ where: { surveyId: surveyIdBin } });
      if (!survey) {
        return Result.fail(new InsertSurveyCompletionSurveyNotFound());
      }

      const student = await this.prisma.student.findFirst({
        where: { studentId },
        include: { surveyCompletions: true },
      });

      if (!student) {
        return Result.fail(new InsertSurveyCompletionStudentNotFound());
      }

      // look for an existing survey completion with this surveyId
      let surveyCompletion = student.surveyCompletions.find(s => s.surveyId === surveyIdBin);

      if (!surveyCompletion) {
        // create a new one
        const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

        surveyCompletion = await this.prisma.surveyCompletion.create({
          data: {
            surveyCompletionId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            surveyId: survey.surveyId,
            studentId,
            created: prismaNow,
            modified: prismaNow,
          },
        });
      }

      return Result.success({
        surveyCompletionId: this.uuidService.binToUUID(surveyCompletion.surveyCompletionId),
        surveyId: this.uuidService.binToUUID(surveyCompletion.surveyId),
        studentId: surveyCompletion.studentId,
        created: this.dateService.fixPrismaReadDate(surveyCompletion.created),
        modified: this.dateService.fixPrismaReadDate(surveyCompletion.modified),
      });

    } catch (err) {
      this.logger.error('error inserting survey completion', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
