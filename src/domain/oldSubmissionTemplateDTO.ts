export type OldSubmissionTemplateDTO = {
  submissionTemplateId: number;
  courseId: number;
  unitLetter: string;
  title: string | null;
  responseType: 'mp3' | null;
  optional: boolean;
  noMarks: boolean;
  noAssignments: boolean;
  optionalUpload: boolean;
};
