export type NewTransferDTO = {
  /** uuid */
  transferId: string;
  /** uuid */
  submissionId: string;
  administratorId: number;
  preTutorId: number;
  postTutorId: number;
  created: Date;
};
