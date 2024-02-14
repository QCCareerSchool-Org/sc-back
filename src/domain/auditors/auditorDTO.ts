export type AuditorDTO = {
  auditorId: number;
  emailAddress: string;
  firstName: string;
  lastName: string;
  passwordChanged: boolean;
  expiry: Date | null;
  created: Date;
  modified: Date | null;
};
