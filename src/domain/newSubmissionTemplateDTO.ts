export type NewSubmissionTemplateDTO = {
  /** uuid */
  submissionTemplateId: string;
  courseId: number;
  unitLetter: string;
  title: string | null;
  description: string | null;
  /** should always be null for students */
  markingCriteria: string | null;
  optional: boolean;
  order: number;
  created: Date;
  modified: Date | null;
};
