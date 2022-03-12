import type { ReadStream } from 'fs';
import type { ResultType } from './result';

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
  stream: ReadStream;
  filename: string;
  mimeType: string;
  size: number;
  lastModified: Date;
  maxAge: number;
};

export * from './authentication';
export * from './student';
