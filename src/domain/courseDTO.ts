export type CourseDTO = {
  courseId: number;
  schoolId: number;
  variantId: number | null;
  code: string;
  version: number;
  studentTypeId: string;
  name: string;
  subheading: string | null;
  courseGuide: boolean;
  quizzesEnabled: boolean;
  noTutor: boolean;
  submissionType: number;
  order: number;
  enabled: boolean;
  submissionsEnabled: boolean;
  designationId: number | null;
  entityVersion: number;
};
