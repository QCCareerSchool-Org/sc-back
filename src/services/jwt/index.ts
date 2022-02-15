export interface IJWTService {
  sign: (payload: string | Record<string, unknown> | Buffer) => Promise<string>;
  verify: (token: string) => Promise<any>;
}
