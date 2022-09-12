export type NewSubmissionPriceDTO = {
  submissionPriceId: string;
  submissionId: string;
  countryId: number | null;
  currencyId: number;
  price: number;
  selected: boolean;
  created: Date;
  modified: Date | null;
};
