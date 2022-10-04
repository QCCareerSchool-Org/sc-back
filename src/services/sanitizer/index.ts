export interface ISanitizerService {
  sanitizeFilename: (filename: string) => string;
  sanitizeHtml: (html: string) => string;
}
