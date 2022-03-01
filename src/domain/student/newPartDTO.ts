export type NewPartDTO = {
  /** uuid */
  partId: string;
  /** uuid */
  assignmentId: string;
  partNumber: number;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
};
