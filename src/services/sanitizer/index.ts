export interface ISanitizerService {
  shortenSanitizedFilename: (shortenedFilename: string) => string;
  sanitizeFilename: (filename: string) => string;
  /** Removes certain HTML tags, like img and script, and attemps to close unclosed tags */
  sanitizeHtml: (html: string) => string;
}
