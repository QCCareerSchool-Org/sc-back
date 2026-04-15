import { ImageConversionService } from './imageConversionService.js';

describe('ImageConversionService', () => {
  let imageConversionService: ImageConversionService;

  beforeEach(() => {
    imageConversionService = new ImageConversionService();
  });

  describe('withFileExtension', () => {
    it('replaces a HEIC extension with jpg', () => {
      expect(imageConversionService.withFileExtension('IMG_1234.HEIC', 'jpg')).toBe('IMG_1234.jpg');
    });

    it('replaces only the final extension', () => {
      expect(imageConversionService.withFileExtension('student.upload.photo.heic', 'jpg')).toBe('student.upload.photo.jpg');
    });

    it('adds the extension when the filename has none', () => {
      expect(imageConversionService.withFileExtension('IMG_1234', 'jpg')).toBe('IMG_1234.jpg');
    });
  });
});
