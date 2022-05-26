import { SanitizerService } from './sanitizerService';

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
});
