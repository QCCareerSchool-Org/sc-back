export type NewMaterialUnitDTO = {
  /** uuid string */
  materialUnitId: string;
  courseId: number;
  unitLetter: string;
  title: string | null;
  order: number;
  created: Date;
  modified: Date | null;
};
