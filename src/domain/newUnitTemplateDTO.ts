export type NewUnitTemplateDTO = {
  /** uuid */
  unitTemplateId: string;
  courseId: number;
  unitLetter: string;
  title: string | null;
  description: string | null;
  /** should always be null for students */
  markingCriteria: string | null;
  optional: boolean;
  order: number;
  enabled: boolean;
  created: Date;
  modified: Date | null;
};
