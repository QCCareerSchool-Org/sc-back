export type CourseDTO = {
  courseId: number;
  schoolId: number;
  code: string;
  version: number;
  studentTypeId: string;
  name: string;
  courseGuide: boolean;
  quizzesEnabled: boolean;
  noTutor: boolean;
  unitType: number;
  order: number;
  enabled: boolean;
  newUnitsEnabled: boolean;
  entityVersion: number;
};
