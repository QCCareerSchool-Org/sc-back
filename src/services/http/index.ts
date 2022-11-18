export interface IHttpService {
  getHeaders: (url: string) => Promise<Record<string, string | undefined>>;
}

export class HttpServiceError extends Error {
  public constructor(message: string, public statusCode: number) {
    super(message);
  }
}
