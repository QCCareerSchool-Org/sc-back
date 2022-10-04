/*
[<>:"/\\|?*]      # file system reserved https://en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
[\x00-\x1F]       # control characters http://msdn.microsoft.com/en-us/library/windows/desktop/aa365247%28v=vs.85%29.aspx
[\x7F\xA0\xAD]    # non-printing characters DEL, NO-BREAK SPACE, SOFT HYPHEN
[#[\]@!$&'()+,;=] # URI reserved https://tools.ietf.org/html/rfc3986#section-2.2
[{}^~`]           # URL unsafe characters https://www.ietf.org/rfc/rfc1738.txt
*/

import santizeHtml from 'sanitize-html';

import type { ISanitizerService } from './index.js';

export class SanitizerService implements ISanitizerService {

  public sanitizeFilename(filename: string): string {
    // eslint-disable-next-line no-control-regex
    return filename.replace(/[<>:"/\\|?*]|[\x00-\x1F]|[\x7F\xA0\xAD]|[#[\]@!$&'()+,;=]|[{}^~`]/gu, '-');
  }

  public shortenSanitizedFilename(sanitizedFilename: string, maxLength = 255): string {
    if (sanitizedFilename.length <= maxLength) {
      return sanitizedFilename;
    }
    const extensionStart = sanitizedFilename.lastIndexOf('.');
    if (extensionStart === -1) { // no extension
      return sanitizedFilename.substring(0, maxLength);
    }
    const extension = sanitizedFilename.substring(extensionStart);
    const extensionLength = extension.length;
    if (extensionLength >= maxLength) { // ignore the extension because it's too long to store
      return sanitizedFilename.substring(0, maxLength);
    }
    return sanitizedFilename.substring(0, maxLength - extensionLength) + extension;
  }

  public sanitizeHtml(html: string): string {
    return santizeHtml(html);
  }
}
