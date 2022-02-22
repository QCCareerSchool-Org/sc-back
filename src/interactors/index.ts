import { ResultType } from './result';

export interface IInteractor<RequestDTO, ResponseDTO> {
  execute: (arg: RequestDTO) => ResultType<ResponseDTO> | Promise<ResultType<ResponseDTO>>;
}

export type InteractorFile = {
  filename: string;
  data: Buffer;
  mimeType: string;
  size: number;
};

export * from './authentication';
export * from './student';
