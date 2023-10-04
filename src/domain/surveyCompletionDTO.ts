export type SurveyCompletionDTO = {
  /** uuid */
  surveyCompletionId: string;
  /** uuid */
  surveyId: string;
  enrollmentId: number;
  created: Date;
  modified: Date | null;
};
