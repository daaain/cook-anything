'use client';

import { Archive, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { downloadAllRecipesAsZip } from '@/lib/recipe-zip';
import type { Recipe } from '@/lib/types';

interface ExportAllButtonProps {
  recipes: Recipe[];
}

export function ExportAllButton({ recipes }: ExportAllButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (recipes.length === 0 || isExporting) return;

    setIsExporting(true);
    try {
      await downloadAllRecipesAsZip(recipes);
    } catch (error) {
      console.error('Failed to export recipes:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting || recipes.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
      Export All
    </button>
  );
}
