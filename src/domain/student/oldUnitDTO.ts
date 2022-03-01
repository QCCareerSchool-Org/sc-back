export type OldUnitDTO = {
  unitId: number;
  enrollmentId: number;
  unitLetter: string;
  title: string | null;
  responseType: 'mp3' | null;
  responseFilename: string | null;
  points: number | null;
  mark: number | null;
  creationDate: Date;
  finalizedDate: Date | null;
  transferredDate: Date | null;
  tutorId: number | null;
  markedDate: Date | null;
  tutorComment: null; // always null for students
  adminComment: string | null;
  optional: boolean;
  noMarks: boolean;
  noAssignments: boolean;
  optionalUpload: boolean;
  order: number;
  skipped: boolean;
  cost: number | null;
  currencyId: number | null;
  audioProgress: number | null;
  entityVersion: number;
  timestamp: Date;
};
