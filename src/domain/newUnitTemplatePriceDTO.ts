export type NewUnitTemplatePriceDTO = {
  unitTemplatePriceId: string;
  unitTemplateId: string;
  countryId: number | null;
  currencyId: number;
  price: number;
  created: Date;
  modified: Date | null;
};
