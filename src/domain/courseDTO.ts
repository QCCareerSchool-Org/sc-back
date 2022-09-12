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
  submissionType: number;
  order: number;
  enabled: boolean;
  submissionsEnabled: boolean;
  entityVersion: number;
};
