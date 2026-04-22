import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IConfigService } from '../services/config/index.js';
import type { ICryptoService } from '../services/crypto/index.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IInteractor } from './index.js';

export type ValidateHMACRequestDTO = {
  data: Buffer | string;
  hmac: string;
};

export type ValidateHMACResponseDTO = void;

abstract class ValidateHMACError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidateHMACFailed extends ValidateHMACError { }

export class ValidateHMACInteractor implements IInteractor<ValidateHMACRequestDTO, ValidateHMACResponseDTO> {
  private static readonly maxAge = 86_400; // one day in seconds

  public constructor(
    private readonly configService: IConfigService,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ data, hmac }: ValidateHMACRequestDTO): Promise<ResultType<ValidateHMACResponseDTO>> {
    try {

      const calculatedHash = this.cryptoService.sha256Hmac(data, this.configService.config.hmacSecret);
      if (hmac !== calculatedHash) {
        return failure(new ValidateHMACFailed());
      }

      return success(undefined);

    } catch (err) {
      this.logger.error('error validating HMAC', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
