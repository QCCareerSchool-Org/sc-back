export type Environment = 'development' | 'production';

export type Config = {
  environment: Environment;
  port: number;
  host: string;
  paths: {
    basePath: string;
    materialsContentPath: string;
    materialsImagePath: string;
    materialsCaptionsPath: string;
    courseGuidesPath: string;
    writingProfilePath: string;
    writingFilePath: string;
    writingCorrectionFilePath: string;
    assignmentsPath: string;
    portfolioPath: string;
    portraitsPath: string;
    courseBannersPath: string;
    unitResponsesPath: string;
    tutorIntroductionPath: string;
    unitFeedbackPath: string;
    assignmentMediaPath: string;
    partMediaPath: string;
  };
  auth: {
    cookieDomain: string;
    /** how long before access tokens should expire, in seconds */
    accessTokenLifetime: number;
    /** how long before refresh tokens should expire, in seconds */
    refreshTokenLifetime: number;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    mode: 'TLS' | 'STARTTLS' | 'INSECURE';
  };
  /** the number of miliseconds a password reset request is valid for */
  passwordResetTimeout: number;
  uploadSlotMaxFilesize: number;
};

export interface IConfigService {
  config: Config;
}
