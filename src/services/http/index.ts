export type HeaderValue = string | string[] | number | boolean | null;

export interface IHttpService {
  getHeaders: (url: string) => Promise<Record<string, HeaderValue | undefined>>;
}

export class HttpServiceError extends Error {
  public constructor(message: string, public statusCode: number) {
    super(message);
  }
}
