export type NewUnitPriceDTO = {
  unitPriceId: string;
  unitId: string;
  countryId: number | null;
  currencyId: number;
  price: number;
  selected: boolean;
  created: Date;
  modified: Date | null;
};
