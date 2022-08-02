import validator from 'email-validator';

import type { IEmailValidatorService } from './index.js';

export class EmailValidatorService implements IEmailValidatorService {

  public validate(emailAddress: string): boolean {
    return validator.validate(emailAddress);
  }
}
