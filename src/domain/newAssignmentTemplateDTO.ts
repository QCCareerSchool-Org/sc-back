import type { NewDescriptionType } from './newDescriptionType.js';

export type NewAssignmentTemplateDTO = {
  /** uuid */
  assignmentTemplateId: string;
  /** uuid */
  unitTemplateId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: NewDescriptionType;
  /** should always be null for students */
  markingCriteria: string | null;
  optional: boolean;
  created: Date;
  modified: Date | null;
};
