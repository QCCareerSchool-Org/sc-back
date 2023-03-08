export interface ISanitizerService {
  shortenSanitizedFilename: (shortenedFilename: string) => string;
  sanitizeFilename: (filename: string) => string;
  sanitizeHtml: (html: string) => string;
}
