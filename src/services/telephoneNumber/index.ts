export interface ITelephoneNumberService {
  /**
   * Returns the telephone number we should display to a visitor from a particular country
   *
   * @param countryCode the two-letter iso-3166-1 alpha-2 country code
   * @returns the telephone number
   */
  get: (countryCode?: string) => string;
}
