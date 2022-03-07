export type NewAssignmentDTO = {
  /** uuid */
  assignmentId: string;
  /** uuid */
  unitId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
  created: Date;
  modified: Date | null;
};
