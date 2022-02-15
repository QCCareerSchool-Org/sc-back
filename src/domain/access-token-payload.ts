import { AccountType } from './account-type';
import { StudentTypeType } from './student-type';

// TODO: convert to a value object with validation

export type AccessTokenPayload = {
  id: number;
  type: AccountType;
  studentType?: StudentTypeType;
  crmId?: number;
  exp: number;
  xsrf: string;
};
