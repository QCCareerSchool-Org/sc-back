export type ProvinceDTO = {
  provinceId: number;
  countryId: number;
  regionId: number | null;
  code: string;
  name: string;
  regionCode: string | null;
  alternateAbbreviation: string | null;
  type: string | null;
  entityVersion: number;
};
