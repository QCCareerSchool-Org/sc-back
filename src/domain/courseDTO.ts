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
  enabled: boolean;
  order: number;
  entityVersion: number;
};
