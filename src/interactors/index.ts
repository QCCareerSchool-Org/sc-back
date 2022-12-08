import type { Stream } from 'stream';
import { environmentConfigService, nodeFileService, winstonLoggerService } from '../services/index.js';
import { DownloadCourseHeaderImageInteractor } from './downloadCourseHeaderImageInteractor.js';
import { DownloadCourseIconImageInteractor } from './downloadCourseIconImageInteractor.js';

import type { ResultType } from './result.js';

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
