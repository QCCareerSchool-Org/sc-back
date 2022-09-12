export type NewSubmissionTemplatePriceDTO = {
  submissionTemplatePriceId: string;
  submissionTemplateId: string;
  countryId: number | null;
  currencyId: number;
  price: number;
  created: Date;
  modified: Date | null;
};
