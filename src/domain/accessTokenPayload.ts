import type { AccountType } from './accountType.js';
import type { StudentTypeType } from './studentType.js';

export type Privileges = {
  submissionPriceChange?: boolean;
  courseDevelopment?: boolean;
  delete?: boolean;
};

export type AccessTokenPayload = {
  studentCenter: {
    id: number;
    type: AccountType;
    studentType?: StudentTypeType;
    privileges?: Privileges;
  };
  crm?: {
    id: number;
    type: AccountType;
  };
  exp: number;
  xsrf: string;
};

export const isAccessTokenPayload = (value: unknown): value is AccessTokenPayload => {
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.exp === 'number' && typeof v.xsrf === 'string' && typeof v.studentCenter === 'object' && v.studentCenter !== null) {
      const s = v.studentCenter as Record<string, unknown>;
      return (typeof s.id === 'number' && typeof s.type === 'string' && [ 'admin', 'tutor', 'student' ].includes(s.type));
    }
  }
  return false;
};
