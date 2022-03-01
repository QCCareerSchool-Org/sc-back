export type NewUnitTemplateDTO = {
  /** uuid */
  unitId: string;
  courseId: number;
  unitLetter: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  created: Date;
  modified: Date | null;
};
