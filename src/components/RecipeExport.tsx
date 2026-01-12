'use client';

import { Download } from 'lucide-react';
import { downloadFile, generateExportFilename, generateRecipeHtml } from '@/lib/recipe-export';
import type { Recipe } from '@/lib/types';

interface RecipeExportProps {
  recipe: Recipe;
}

export function RecipeExport({ recipe }: RecipeExportProps) {
  const handleExport = () => {
    const html = generateRecipeHtml(recipe);
    const filename = generateExportFilename(recipe);
    downloadFile(html, filename);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
    >
      <Download className="w-4 h-4" />
      Export HTML
    </button>
  );
}
