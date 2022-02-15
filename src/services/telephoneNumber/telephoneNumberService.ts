import { ITelephoneNumberService } from '.';

export class TelephoneNumberService implements ITelephoneNumberService {

  public get(countryCode?: string): string {
    switch (this.getCallingCode(countryCode)) {
      case 1:
        return '1-833-600-3751';
      case 44:
        return '0800 066 4734';
      case 61:
        return '0800-451-979';
      case 64:
        return '1800 531 923';
      default:
        return '+1 613-749-8248';
    }
  }

  /**
   * Returns whether the country is a country with a +44 country dialing code. E.g., United Kingdom
   *
   * @param countryCode the two-letter iso-3166-1 alpha-2 country code
   * @returns boolean
   */
  private isCallingCode44(countryCode: string): boolean {
    return [ 'GB', 'IM', 'GG', 'JE' ].includes(countryCode);
  }

  /**
   * Returns whether the country is a country with a +61 country dialing code. E.g., Australia
   *
   * @param countryCode the two-letter iso-3166-1 alpha-2 country code
   * @returns boolean
   */
  private isCallingCode61(countryCode: string): boolean {
    return [ 'AU', 'CX', 'CC' ].includes(countryCode);
  }

  /**
   * Returns whether the country is a country with a +64 country dialing code. E.g., New Zealand
   *
   * @param countryCode the two-letter iso-3166-1 alpha-2 country code
   * @returns boolean
   */
  private isCallingCode64(countryCode: string): boolean {
    return [ 'NZ', 'PN' ].includes(countryCode);
  }

  /**
   * Returns whether the country is a country with a +1 country dialing code. E.g., Canada, United States, Jamaica
   *
   * @param countryCode the two-letter iso-3166-1 alpha-2 country code
   * @returns boolean
   */
  private isCallingCode1(countryCode: string): boolean {
    return [ 'CA', 'US', 'AG', 'AI', 'AS', 'BB', 'BM', 'BS', 'DM', 'DO', 'GD', 'GU', 'JM', 'KN', 'KY', 'LC', 'MP', 'MS', 'PR', 'SX', 'TC', 'TT', 'VC', 'VG', 'VI', 'UM' ].includes(countryCode);
  }

  /**
   * Returns the country dialing code for a particular country. Only supports +1, +44, +61, and +64.
   * Returns null for unknown
   *
   * @param countryCode the two-letter iso-3166-1 alpha-2 country code
   * @returns the country dialing code, or null if unknown
   */
  private getCallingCode(countryCode?: string): number | null {
    if (typeof countryCode === 'undefined') {
      return null;
    }
    if (this.isCallingCode1(countryCode)) {
      return 1;
    }
    if (this.isCallingCode44(countryCode)) {
      return 44;
    }
    if (this.isCallingCode61(countryCode)) {
      return 61;
    }
    if (this.isCallingCode64(countryCode)) {
      return 64;
    }
    return null;
  }
}
