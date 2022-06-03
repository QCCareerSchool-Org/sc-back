import dotenv from 'dotenv';

import type { Config, IConfigService } from './index.js';

dotenv.config();

export class EnvironmentConfigService implements IConfigService {
  static #defaultPort = 8080;

  readonly #config: Config;

  public constructor() {
    const environment = process.env.NODE_ENV;
    if (environment !== 'development' && environment !== 'production') {
      throw Error('Environment variable NODE_ENV must be \'development\' or \'production\'');
    }

    const port = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : EnvironmentConfigService.#defaultPort;

    const host = process.env.HOST;
    if (typeof host === 'undefined') {
      throw Error('Environment variable HOST is undefined');
    }

    const basePath = process.env.BASE_PATH ?? '/tmp';

    const smtpHost = process.env.SMTP_HOST;
    if (typeof smtpHost === 'undefined') {
      throw Error('Environment variable SMTP_HOST is undefined');
    }

    const smtpPort = process.env.SMTP_PORT;
    if (typeof smtpPort === 'undefined') {
      throw Error('Environment variable SMTP_PORT is undefined');
    }
    const smtpPortNumber = parseInt(smtpPort, 10);
    if (isNaN(smtpPortNumber)) {
      throw Error('Environment variable SMTP_PORT is invalid');
    }

    const smtpUser = process.env.SMTP_USERNAME;
    if (typeof smtpUser === 'undefined') {
      throw Error('Environment variable SMTP_USERNAME is undefined');
    }

    const smtpPassword = process.env.SMTP_PASSWORD;
    if (typeof smtpPassword === 'undefined') {
      throw Error('Environment variable SMTP_PASSWORD is undefined');
    }

    const smtpMode = process.env.SMTP_MODE;
    if (typeof smtpMode === 'undefined') {
      throw Error('Environment variable SMTP_MODE is undefined');
    }
    if (smtpMode !== 'TLS' && smtpMode !== 'STARTTLS' && smtpMode !== 'INSECURE') {
      throw Error('Environment variable SMTP_MODE is invalid');
    }

    const passwordResetTimeout = process.env.PASSWORD_RESET_TIMEOUT;
    if (typeof passwordResetTimeout === 'undefined') {
      throw Error('Environment variable PASSWORD_RESET_TIMEOUT is undefined');
    }
    const passwordResetTimeoutNumber = parseInt(passwordResetTimeout, 10);
    if (isNaN(passwordResetTimeoutNumber)) {
      throw Error('Environment variable PASSWORD_RESET_TIMEOUT is invalid');
    }

    const lessonArchiveMaxFileSize = process.env.LESSON_ARCHIVE_MAX_FILESIZE;
    if (typeof lessonArchiveMaxFileSize === 'undefined') {
      throw Error('Environment variable LESSON_ARCHIVE_MAX_FILESIZE is undefined');
    }
    const lessonArchiveMaxFileSizeNumber = parseInt(lessonArchiveMaxFileSize, 10);
    if (isNaN(lessonArchiveMaxFileSizeNumber)) {
      throw Error('Environment variable LESSON_ARCHIVE_MAX_FILESIZE is invalid');
    }

    const downloadMaxFileSize = process.env.DOWNLOAD_MAX_FILESIZE;
    if (typeof downloadMaxFileSize === 'undefined') {
      throw Error('Environment variable DOWNLOAD_MAX_FILESIZE is undefined');
    }
    const downloadMaxFileSizeNumber = parseInt(downloadMaxFileSize, 10);
    if (isNaN(downloadMaxFileSizeNumber)) {
      throw Error('Environment variable DOWNLOAD_MAX_FILESIZE is invalid');
    }

    this.#config = {
      environment,
      port,
      host,
      paths: {
        basePath,
        materialsContentPath: process.env.MATERIALS_CONTENT_PATH ?? basePath + '/course-materials/content',
        materialsImagePath: process.env.MATERIALS_IMAGE_PATH ?? basePath + '/course-materials/images',
        materialsCaptionsPath: process.env.MATERIALS_IMAGE_PATH ?? basePath + '/course-materials/captions',
        courseGuidesPath: process.env.MATERIALS_IMAGE_PATH ?? basePath + '/course-guides',
        writingProfilePath: process.env.WRITING_PROFILE_PATH ?? basePath + '/writing-profiles',
        writingFilePath: process.env.WRITING_FILE_PATH ?? basePath + '/writing-files',
        writingCorrectionFilePath: process.env.WRITING_CORRECTION_FILE_PATH ?? basePath + '/writing-corrections',
        assignmentsPath: process.env.ASSIGNMENTS_PATH ?? basePath + '/assignments',
        portfolioPath: process.env.PORTFOLIO_PATH ?? basePath + '/pictures',
        portraitsPath: process.env.PORTRAITS_PATH ?? basePath + '/portraits',
        courseBannersPath: process.env.COURSE_BANNERS_PATH ?? basePath + '/course-banners',
        unitResponsesPath: process.env.UNIT_RESPONSES_PATH ?? basePath + '/audio replies',
        tutorIntroductionPath: process.env.TUTOR_INTRODUCTION_PATH ?? basePath + '/tutor introductions',
        unitFeedbackPath: basePath + '/unit-feedback',
        assignmentMediaPath: basePath + '/course-materials/assignment-media',
        partMediaPath: basePath + '/course-materials/part-media',
        lessonsPath: basePath + '/lessons',
        downloadsPath: basePath + '/downloads',
      },
      lessonArchiveMaxFileSize: lessonArchiveMaxFileSizeNumber,
      downloadMaxFileSize: downloadMaxFileSizeNumber,
      auth: {
        cookieDomain: process.env.COOKIE_DOMAIN ?? 'sc.qccareerschool.com',
        accessTokenLifetime: process.env.ACCESS_TOKEN_LIFETIME ? parseInt(process.env.ACCESS_TOKEN_LIFETIME, 10) : 30 * 60, // 30-minute default
        refreshTokenLifetime: process.env.REFRESH_TOKEN_LIFETIME ? parseInt(process.env.REFRESH_TOKEN_LIFETIME, 10) : 30 * 60 * 60 * 24, // 30-day default
      },
      email: {
        host: smtpHost,
        port: smtpPortNumber,
        user: smtpUser,
        pass: smtpPassword,
        mode: smtpMode,
      },
      passwordResetTimeout: passwordResetTimeoutNumber,
      uploadSlotMaxFilesize: process.env.UPLOAD_SLOT_MAX_FILESIZE ? parseInt(process.env.UPLOAD_SLOT_MAX_FILESIZE, 10) : 33_554_432, // 32 MB
    };
  }

  public get config(): Config { return this.#config; }
}
