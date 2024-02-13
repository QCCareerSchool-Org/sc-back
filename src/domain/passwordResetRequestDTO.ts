export type PasswordResetRequestDTO = {
  id: number;
  code: string;
  studentId: number | null;
  tutorId: number | null;
  administratorId: number | null;
  auditorId: number | null;
  used: boolean;
  requestDate: Date;
  expiryDate: Date | null;
};
