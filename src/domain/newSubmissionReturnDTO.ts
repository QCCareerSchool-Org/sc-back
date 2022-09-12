export type NewSubmissionReturnDTO = {
  /** uuid */
  submissionReturnId: string;
  /** uuid */
  submissionId: string;
  returned: Date;
  completed: Date | null;
};
