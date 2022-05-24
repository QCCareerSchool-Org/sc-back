export type NewUnitReturnDTO = {
  /** uuid */
  unitReturnId: string;
  /** uuid */
  unitId: string;
  returned: Date;
  completed: Date | null;
};
