interface NullableDateFixer {
  (d: Date): Date;
  (d: null): null;
  (d: Date | null): Date | null;
}

/**
 * Service for working with dates
 */
export interface IDateService {
  getDate: () => Date;
  getLocalDate: (date?: Date) => string;
  formatDateTime: (date: Date) => string;
  fixPrismaReadDate: NullableDateFixer;
  fixPrismaWriteDate: NullableDateFixer;
}
