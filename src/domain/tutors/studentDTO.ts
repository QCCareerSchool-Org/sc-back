export type StudentDTO = {
  studentId: number;
  countryId: number;
  provinceId: number | null;
  studentTypeId: string;
  sex: 'M' | 'F';
  firstName: string;
  lastName: string;
  tutorNote: string | null;
  adminNote: string | null;
  entityVersion: number;
  modified: Date;
};
