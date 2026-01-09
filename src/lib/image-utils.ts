export const DEFAULT_MAX_IMAGE_DIMENSION = 2000;

/**
 * Resize an image if it exceeds the max dimension, converting to JPEG.
 * Returns the original file if already small enough.
 */
export async function resizeImage(
  file: File,
  maxDimension = DEFAULT_MAX_IMAGE_DIMENSION,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Skip resizing if already small enough
      if (img.width <= maxDimension && img.height <= maxDimension) {
        resolve(file);
        return;
      }

      // Calculate new dimensions preserving aspect ratio
      const ratio = Math.min(maxDimension / img.width, maxDimension / img.height);
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      // Draw to canvas and export as JPEG
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/jpeg',
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
