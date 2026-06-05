export type AwardDTO = {
  /** uuid */
  submissionId: string | number;
  courseName: string;
  schoolName: string;
  unitLetter: string;
  grade: string;
  /** the student's name */
  name: string;
  created: Date;
  designation: string;
};
