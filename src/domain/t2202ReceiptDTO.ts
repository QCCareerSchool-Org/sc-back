export type T2202ReceiptDTO = {
  t2202ReceiptId: number;
  enrollmentId: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  tuition: number;
  address1: string;
  address2: string | null;
  city: string;
  postalCode: string | null;
  provinceId: number | null;
  countryId: number;
  accessed: number;
  version: number;
};
