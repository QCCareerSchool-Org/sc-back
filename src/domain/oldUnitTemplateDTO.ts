export type OldUnitTemplateDTO = {
  unitId: number;
  courseId: number;
  unitLetter: string;
  title: string | null;
  responseType: 'mp3' | null;
  optional: boolean;
  noMarks: boolean;
  noAssignments: boolean;
  optionalUpload: boolean;
};
