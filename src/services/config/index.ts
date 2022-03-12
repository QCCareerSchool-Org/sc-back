export type Environment = 'development' | 'production';

export type Config = {
  environment: Environment;
  port: number;
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
  passwordResetTimeout: number;
  uploadSlotMaxFilesize: number;
};

export interface IConfigService {
  config: Config;
}
