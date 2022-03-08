import axios, { AxiosError } from 'axios';

import { HttpServiceError, IHttpService } from '.';

export class AxiosHttpService implements IHttpService {

  public async getHeaders(url: string): Promise<Record<string, string>> {
    try {
      const response = await axios.head(url);
      return response.headers;
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        throw new HttpServiceError(err.response.statusText, err.response.status);
      } else if (err instanceof Error) {
        throw new HttpServiceError(err.message, 0);
      } else {
        throw new HttpServiceError('unknown error', 0);
      }
    }
  }
}

const isAxiosError = (err: any): err is AxiosError => !!err.isAxiosError?.();
