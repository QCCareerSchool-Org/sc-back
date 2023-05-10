import { SanitizerService } from './sanitizerService.js';

const invalidChars = [ '<', '>', ':', '"', '/', '\\', '|', '?', '*', '#', '[', ']', '@', '!', '&', '\'', '(', ')', '+', ',', ';', '=', '{', '}', '^', '~', '`' ];
const controlChars = [ '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07', '\x08', '\x09', '\x0a', '\x0b', '\x0c', '\x0d', '\x0e', '\x0f', '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17', '\x18', '\x19', '\x1a', '\x1b', '\x1c', '\x1d', '\x1e', '\x1f' ];
const nonPrinting = [ '\x7f', '\xa0', '\xad' ]; // DEL, NO-BREAK SPACE, SOFT HYPHEN

describe('SanitizerService', () => {
  let sanitizerService: SanitizerService;

  beforeEach(() => {
    sanitizerService = new SanitizerService();
  });

  describe('sanitizeFilename', () => {

    [ invalidChars, controlChars, nonPrinting ].forEach(chars => {
      chars.forEach(c => {
        it(`should replace the character ${c} with a hyphen`, () => {
          expect(sanitizerService.sanitizeFilename(`foo${c}bar${c}baz.txt`)).toBe('foo-bar-baz.txt');
        });
      });
    });
  });

  describe('shortenSanitizedFilename', () => {

    it('should exist', () => {
      expect(typeof sanitizerService.shortenSanitizedFilename).toBe('function');
    });

    it('should shorten a filename, but keep its extension', () => {
      expect(sanitizerService.shortenSanitizedFilename('a really really really long filename.txt', 25)).toBe('a really really reall.txt');
    });

    it('should keep the filename intact if it\'s shorter than the desired length', () => {
      expect(sanitizerService.shortenSanitizedFilename('a short filename.txt', 25)).toBe('a short filename.txt');
    });

    it('should truncate long filenames with no extension', () => {
      expect(sanitizerService.shortenSanitizedFilename('a really really really long filename', 25)).toBe('a really really really lo');
    });

    it('should drop extensions that are longer than the maximum length', () => {
      expect(sanitizerService.shortenSanitizedFilename('a really really really long filename.a really really really long extension', 25)).toBe('a really really really lo');
    });

    it('should default to a max length of 255', () => {
      const longName = 'x'.repeat(300);
      const expected = 'x'.repeat(255);
      expect(sanitizerService.shortenSanitizedFilename(longName)).toBe(expected);
    });
  });

  describe('sanitizeHtml', () => {
    it('should turn remove <img> tags', () => {
      const input = '<p>Hello <img src="test.jpg" />World!</p>';
      expect(sanitizerService.sanitizeHtml(input)).toBe('<p>Hello World!</p>');
    });

    it('should turn remove <script> tags', () => {
      const input = '<p>Hello <script src="foo.js"></script><script>alert(\'!!!\');</script>World!</p>';
      expect(sanitizerService.sanitizeHtml(input)).toBe('<p>Hello World!</p>');
    });

    it('should close unclosed tags', () => {
      const input = '<p>Hello World!<p>How are you?';
      expect(sanitizerService.sanitizeHtml(input)).toBe('<p>Hello World!</p><p>How are you?</p>');
    });
  });
});
