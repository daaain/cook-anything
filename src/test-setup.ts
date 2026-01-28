// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Test infrastructure with unavoidable type mismatches between node-canvas and browser APIs
import '@testing-library/jest-dom';
import { Canvas, type Image as CanvasImage, createCanvas, loadImage } from 'canvas';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
});

const { window } = dom;

// Override document.createElement to return node-canvas for canvas elements
// with a polyfill for toBlob (node-canvas uses toBuffer instead)
const originalCreateElement = window.document.createElement.bind(window.document);
window.document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
  if (tagName.toLowerCase() === 'canvas') {
    const canvas = createCanvas(300, 150) as Canvas & {
      toBlob: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void;
    };

    // Add toBlob polyfill using toBuffer
    canvas.toBlob = function (
      callback: (blob: Blob | null) => void,
      type = 'image/png',
      quality?: number,
    ) {
      try {
        const mimeType = type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        const config = mimeType === 'image/jpeg' && quality !== undefined ? { quality } : undefined;
        const buffer = this.toBuffer(mimeType as 'image/png' | 'image/jpeg', config);
        const blob = new Blob([buffer], { type: mimeType });
        // Call async to match browser behavior
        setTimeout(() => callback(blob), 0);
      } catch {
        setTimeout(() => callback(null), 0);
      }
    };

    return canvas as unknown as HTMLCanvasElement;
  }
  return originalCreateElement(tagName, options);
}) as typeof window.document.createElement;

// Polyfill URL.createObjectURL and revokeObjectURL (not available in jsdom)
const blobUrlMap = new Map<string, Blob>();
let blobCounter = 0;

window.URL.createObjectURL = (blob: Blob): string => {
  const url = `blob:http://localhost/${blobCounter++}`;
  blobUrlMap.set(url, blob);
  return url;
};

window.URL.revokeObjectURL = (url: string): void => {
  blobUrlMap.delete(url);
};

// Custom Image class that can load blob URLs using the canvas package
// We need to create a wrapper that properly loads the image into CanvasImage
class TestImage {
  private _innerImage: CanvasImage | null = null;
  private _src = '';
  public onload: (() => void) | null = null;
  public onerror: ((err: Error) => void) | null = null;

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    this.loadSource(value);
  }

  get width(): number {
    return this._innerImage?.width ?? 0;
  }

  get height(): number {
    return this._innerImage?.height ?? 0;
  }

  // This is needed for ctx.drawImage to work with node-canvas
  get [Symbol.toStringTag](): string {
    return 'HTMLImageElement';
  }

  // Expose the inner image for drawImage
  getInnerImage(): CanvasImage | null {
    return this._innerImage;
  }

  private async loadSource(src: string): Promise<void> {
    try {
      let buffer: Buffer;

      if (src.startsWith('blob:')) {
        // Load from our blob URL map
        const blob = blobUrlMap.get(src);
        if (!blob) {
          throw new Error(`Blob not found for URL: ${src}`);
        }
        // Use FileReader since jsdom's Blob doesn't support arrayBuffer()
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsArrayBuffer(blob);
        });
        buffer = Buffer.from(arrayBuffer);
      } else if (src.startsWith('data:')) {
        // Load from data URL
        const base64 = src.split(',')[1];
        buffer = Buffer.from(base64, 'base64');
      } else {
        throw new Error(`Unsupported image source: ${src}`);
      }

      // Use canvas loadImage to decode the image data into a proper CanvasImage
      this._innerImage = await loadImage(buffer);

      // Trigger onload
      if (this.onload) {
        this.onload();
      }
    } catch (error) {
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

// Patch canvas context to use the inner image from TestImage
const originalGetContext = (
  Canvas.prototype as { getContext: (type: string) => CanvasRenderingContext2D | null }
).getContext;
(
  Canvas.prototype as {
    getContext: (type: string, options?: unknown) => CanvasRenderingContext2D | null;
  }
).getContext = function (type: string) {
  const ctx = originalGetContext.call(this, type) as CanvasRenderingContext2D & {
    drawImage: (image: TestImage | CanvasImage, ...args: number[]) => void;
  };
  if (ctx && type === '2d') {
    const originalDrawImage = ctx.drawImage.bind(ctx);
    ctx.drawImage = (image: TestImage | CanvasImage, ...args: number[]) => {
      // If it's a TestImage, use its inner CanvasImage
      const actualImage = (image as TestImage).getInnerImage?.() ?? image;
      return originalDrawImage(actualImage as CanvasImage, ...args);
    };
  }
  return ctx;
};

// Expose browser globals
global.window = window as unknown as Window & typeof globalThis;
global.document = window.document;
global.navigator = window.navigator as unknown as Navigator;
global.HTMLElement = window.HTMLElement;
global.HTMLCanvasElement = window.HTMLCanvasElement;
global.Element = window.Element;
global.Node = window.Node;
global.Image = TestImage as unknown as typeof Image;
(window as Window & { Image: typeof Image }).Image = TestImage as unknown as typeof Image;
global.File = window.File;
global.Blob = window.Blob;
global.FileReader = window.FileReader;
global.URL = window.URL;
global.localStorage = window.localStorage;
