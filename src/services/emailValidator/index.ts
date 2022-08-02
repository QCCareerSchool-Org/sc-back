export interface IEmailValidatorService {
  validate: (emailAddress: string) => boolean;
}
