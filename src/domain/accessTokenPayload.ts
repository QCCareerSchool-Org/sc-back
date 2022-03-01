import { AccountType } from './accountType';
import { StudentTypeType } from './studentType';

export type AccessTokenPayload = {
  id: number;
  type: AccountType;
  studentType?: StudentTypeType;
  crmId?: number;
  exp: number;
  xsrf: string;
};
