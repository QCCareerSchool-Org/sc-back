export type StudentDTO = {
  studentId: number;
  countryId: number;
  provinceId: number | null;
  studentTypeId: string;
  sex: 'M' | 'F';
  firstName: string;
  lastName: string;
  numLogins: number;
  lastLogin: Date | null;
  expiry: Date | null;
  emailAddress: undefined;
  arrears: boolean;
  entityVersion: number;
  created: Date;
  modified: Date;
};
