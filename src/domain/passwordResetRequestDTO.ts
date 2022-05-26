export type PasswordResetRequestDTO = {
  id: number;
  code: string;
  administratorId: number | null;
  tutorId: number | null;
  studentId: number | null;
  used: boolean;
  requestDate: Date;
  expiryDate: Date | null;
};
