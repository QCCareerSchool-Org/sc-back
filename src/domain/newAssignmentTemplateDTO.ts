export type NewAssignmentTemplateDTO = {
  /** uuid */
  assignmentId: string;
  /** uuid */
  unitId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  optional: boolean;
  created: Date;
  modified: Date | null;
};
