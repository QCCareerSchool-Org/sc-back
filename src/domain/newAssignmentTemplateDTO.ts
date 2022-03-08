export type NewAssignmentTemplateDTO = {
  /** uuid */
  assignmentTemplateId: string;
  /** uuid */
  unitTemplateId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  optional: boolean;
  created: Date;
  modified: Date | null;
};
