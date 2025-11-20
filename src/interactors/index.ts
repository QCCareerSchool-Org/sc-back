import type { Stream } from 'stream';

import { prisma } from '../frameworks/prisma/index.js';
import { dateService, environmentConfigService, gradeService, nodeCryptoService, nodeFileService, uuidService, winstonLoggerService } from '../services/index.js';
import { DownloadCourseHeaderImageInteractor } from './downloadCourseHeaderImageInteractor.js';
import { DownloadCourseIconImageInteractor } from './downloadCourseIconImageInteractor.js';
import { GetAwardInteractor } from './getAwardInteractor.js';
import { GetOldAwardInteractor } from './getOldAwardInteractor.js';
import { GetVideoInteractor } from './getVideoInteractor.js';
import { InsertSurveyCompletionInteractor } from './insertSurveyCompletionInteractor.js';
import type { ResultType } from './result.js';
import { ValidateHMACInteractor } from './validateHMACInteractor.js';

export class InsufficientPrivileges extends Error { }

export interface IInteractor<RequestDTO, ResponseDTO> {
  execute: (arg: RequestDTO) => ResultType<ResponseDTO> | Promise<ResultType<ResponseDTO>>;
}

export type InteractorFileMemoryUpload = {
  data: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileDiskUpload = {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileStreamUpload = {
  stream: Stream;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileStreamDownload = {
  stream: Stream;
  filename: string;
  mimeType: string;
  size: number;
  lastModified: Date;
  maxAge: number;
  contentEncoding?: string;
  byteRange?: { start: number; end: number };
  download?: boolean;
};

export const downloadCourseHeaderImageInteractor = new DownloadCourseHeaderImageInteractor(nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadCourseIconImageInteractor = new DownloadCourseIconImageInteractor(nodeFileService, environmentConfigService, winstonLoggerService);
export const getVideoInteractor = new GetVideoInteractor(prisma, uuidService, winstonLoggerService);
export const insertSurveyCompletionInteractor = new InsertSurveyCompletionInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const validateHMACInteractor = new ValidateHMACInteractor(environmentConfigService, nodeCryptoService, winstonLoggerService);
export const getAwardInteractor = new GetAwardInteractor(prisma, uuidService, gradeService, winstonLoggerService);
export const getOldAwardInteractor = new GetOldAwardInteractor(prisma, uuidService, gradeService, winstonLoggerService);
