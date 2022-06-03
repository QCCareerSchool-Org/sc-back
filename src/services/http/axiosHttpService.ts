import { default as axios } from 'axios';

import type { IHttpService } from './index.js';
import { HttpServiceError } from './index.js';

export class AxiosHttpService implements IHttpService {

  public async getHeaders(url: string): Promise<Record<string, string>> {
    try {
      const response = await axios.head(url);
      return response.headers;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        throw new HttpServiceError(err.response.statusText, err.response.status);
      } else if (err instanceof Error) {
        throw new HttpServiceError(err.message, 0);
      } else {
        throw new HttpServiceError('unknown error', 0);
      }
    }
  }
}
