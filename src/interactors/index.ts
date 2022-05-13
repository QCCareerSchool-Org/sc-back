import type { Stream } from 'stream';
import type { ResultType } from './result';

export class InsufficientPrivileges extends Error { }

export interface IInteractor<RequestDTO, ResponseDTO> {
  execute: (arg: RequestDTO) => ResultType<ResponseDTO> | Promise<ResultType<ResponseDTO>>;
}

export type InteractorFile = {
  data: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileStream = {
  stream: Stream;
  filename: string;
  mimeType: string;
  size: number;
  lastModified: Date;
  maxAge: number;
  contentEncoding?: string;
  byteRange?: { start: number; end: number };
};
