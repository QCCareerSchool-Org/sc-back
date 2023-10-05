export type SurveyCompletionDTO = {
  /** uuid */
  surveyCompletionId: string;
  /** uuid */
  surveyId: string;
  studentId: number;
  created: Date;
  modified: Date | null;
};
