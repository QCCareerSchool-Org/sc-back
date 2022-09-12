export type UnitDTO = {
  /** uuid string */
  unitId: string;
  courseId: number;
  unitLetter: string;
  title: string | null;
  order: number;
  created: Date;
  modified: Date | null;
};
