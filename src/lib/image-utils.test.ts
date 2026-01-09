import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_MAX_IMAGE_DIMENSION, resizeImage } from './image-utils';

/**
 * Creates a test image file with specific dimensions.
 * Uses canvas to generate actual image data.
 */
async function createTestImage(width: number, height: number, type = 'image/png'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw something to ensure valid image data
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], 'test-image.png', { type }));
        } else {
          reject(new Error('Failed to create test image blob'));
        }
      },
      type,
      1.0,
    );
  });
}

/**
 * Gets the dimensions of a blob by loading it as an image.
 */
async function getBlobDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

describe('resizeImage', () => {
  describe('when image is within size limits', () => {
    it('returns original file when both dimensions are within default limit', async () => {
      const file = await createTestImage(1000, 800);

      const result = await resizeImage(file);

      // Should return the exact same file object
      expect(result).toBe(file);
    });

    it('returns original file when dimensions equal the limit', async () => {
      const file = await createTestImage(DEFAULT_MAX_IMAGE_DIMENSION, DEFAULT_MAX_IMAGE_DIMENSION);

      const result = await resizeImage(file);

      expect(result).toBe(file);
    });

    it('returns original file for small square images', async () => {
      const file = await createTestImage(500, 500);

      const result = await resizeImage(file);

      expect(result).toBe(file);
    });
  });

  describe('when image exceeds size limits', () => {
    it('resizes landscape image preserving aspect ratio', async () => {
      const file = await createTestImage(4000, 2000);

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      // 4000x2000 with maxDimension 2000 should become 2000x1000
      expect(dimensions.width).toBe(2000);
      expect(dimensions.height).toBe(1000);
    });

    it('resizes portrait image preserving aspect ratio', async () => {
      const file = await createTestImage(2000, 4000);

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      // 2000x4000 with maxDimension 2000 should become 1000x2000
      expect(dimensions.width).toBe(1000);
      expect(dimensions.height).toBe(2000);
    });

    it('resizes square image to max dimension', async () => {
      const file = await createTestImage(3000, 3000);

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      expect(dimensions.width).toBe(2000);
      expect(dimensions.height).toBe(2000);
    });

    it('converts resized image to JPEG format', async () => {
      const file = await createTestImage(4000, 2000, 'image/png');

      const result = await resizeImage(file);

      expect(result.type).toBe('image/jpeg');
    });

    it('does not return the original file when resizing', async () => {
      const file = await createTestImage(4000, 2000);

      const result = await resizeImage(file);

      expect(result).not.toBe(file);
    });
  });

  describe('custom maxDimension parameter', () => {
    it('respects custom maxDimension for large images', async () => {
      const file = await createTestImage(2000, 1000);

      const result = await resizeImage(file, 500);
      const dimensions = await getBlobDimensions(result);

      // 2000x1000 with maxDimension 500 should become 500x250
      expect(dimensions.width).toBe(500);
      expect(dimensions.height).toBe(250);
    });

    it('returns original when within custom maxDimension', async () => {
      const file = await createTestImage(400, 300);

      const result = await resizeImage(file, 500);

      expect(result).toBe(file);
    });

    it('handles very small maxDimension', async () => {
      const file = await createTestImage(1000, 500);

      const result = await resizeImage(file, 100);
      const dimensions = await getBlobDimensions(result);

      expect(dimensions.width).toBe(100);
      expect(dimensions.height).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('handles image where only width exceeds limit', async () => {
      const file = await createTestImage(4000, 1000);

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      // Width is limiting factor: 4000 -> 2000, height scales to 500
      expect(dimensions.width).toBe(2000);
      expect(dimensions.height).toBe(500);
    });

    it('handles image where only height exceeds limit', async () => {
      const file = await createTestImage(1000, 4000);

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      // Height is limiting factor: 4000 -> 2000, width scales to 500
      expect(dimensions.width).toBe(500);
      expect(dimensions.height).toBe(2000);
    });

    it('rounds dimensions correctly for odd ratios', async () => {
      const file = await createTestImage(3333, 2222);

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      // 3333/2000 = 1.6665, so ratio = 0.6001
      // width = round(3333 * 0.6001) = 2000
      // height = round(2222 * 0.6001) = 1333
      expect(dimensions.width).toBe(2000);
      expect(dimensions.height).toBe(1333);
    });
  });

  describe('error handling', () => {
    it('rejects when given invalid image data', async () => {
      // Create a file with invalid image data
      const invalidData = new Uint8Array([0, 1, 2, 3, 4]);
      const invalidFile = new File([invalidData], 'invalid.png', { type: 'image/png' });

      await expect(resizeImage(invalidFile)).rejects.toThrow('Failed to load image');
    });

    it('rejects when given empty file', async () => {
      const emptyFile = new File([], 'empty.png', { type: 'image/png' });

      await expect(resizeImage(emptyFile)).rejects.toThrow('Failed to load image');
    });
  });

  describe('DEFAULT_MAX_IMAGE_DIMENSION constant', () => {
    it('exports the correct default value', () => {
      expect(DEFAULT_MAX_IMAGE_DIMENSION).toBe(2000);
    });
  });

  describe('real image fixture', () => {
    it('resizes a real large photo correctly', async () => {
      // Load the real test image (6144x8160 portrait from Pixel 8 Pro)
      const fixturePath = join(process.cwd(), 'fixtures', 'PXL_20260109_185623899.jpg');
      const imageBuffer = readFileSync(fixturePath);
      const file = new File([imageBuffer], 'PXL_20260109_185623899.jpg', {
        type: 'image/jpeg',
      });

      const result = await resizeImage(file);
      const dimensions = await getBlobDimensions(result);

      // 6144x8160 with maxDimension 2000
      // Height is limiting: ratio = 2000/8160 ≈ 0.2451
      // width = round(6144 * 0.2451) = 1506
      // height = round(8160 * 0.2451) = 2000
      expect(dimensions.height).toBe(2000);
      expect(dimensions.width).toBe(1506);
      expect(result.type).toBe('image/jpeg');
    });
  });
});
