import JSZip from 'jszip';
import { downloadFile, generateExportFilename, generateRecipeHtml } from './recipe-export';
import type { Recipe } from './types';

/**
 * Export all recipes as a ZIP file containing individual HTML files.
 */
export async function exportAllRecipesToZip(recipes: Recipe[]): Promise<Blob> {
  const zip = new JSZip();
  const usedFilenames = new Set<string>();

  for (const recipe of recipes) {
    let filename = generateExportFilename(recipe);

    // Handle duplicate filenames by appending a number
    if (usedFilenames.has(filename)) {
      const baseName = filename.replace('.html', '');
      let counter = 2;
      while (usedFilenames.has(`${baseName}-${counter}.html`)) {
        counter++;
      }
      filename = `${baseName}-${counter}.html`;
    }

    usedFilenames.add(filename);
    const html = generateRecipeHtml(recipe);
    zip.file(filename, html);
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Generate a filename for the ZIP export.
 */
export function generateZipFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `recipes-export-${date}.zip`;
}

/**
 * Download all recipes as a ZIP file.
 */
export async function downloadAllRecipesAsZip(recipes: Recipe[]): Promise<void> {
  const blob = await exportAllRecipesToZip(recipes);
  const filename = generateZipFilename();
  downloadFile(blob, filename, 'application/zip');
}
