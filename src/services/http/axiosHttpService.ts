import axios from 'axios';

import type { HeaderValue, IHttpService } from './index.js';
import { HttpServiceError } from './index.js';

export class AxiosHttpService implements IHttpService {

  public async getHeaders(url: string): Promise<Record<string, HeaderValue | undefined>> {
    try {
      const response = await axios.head(url);
      return response.headers as Record<string, HeaderValue | undefined>;
    } catch (err) {
      // axios doesn't export isAxiosError in the esm version?
      // eslint-disable-next-line import/no-named-as-default-member
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
