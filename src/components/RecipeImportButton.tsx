'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseRecipeFromHtml } from '@/lib/recipe-export';
import { type ImportResult, importRecipes, previewImport } from '@/lib/storage';
import type { Recipe } from '@/lib/types';
import { ImportPreviewModal } from './ImportPreviewModal';

interface RecipeImportButtonProps {
  onImportComplete: () => void;
}

export function RecipeImportButton({ onImportComplete }: RecipeImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [parsedRecipes, setParsedRecipes] = useState<Recipe[]>([]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const recipes: Recipe[] = [];

    for (const file of Array.from(files)) {
      try {
        const html = await file.text();
        const recipe = parseRecipeFromHtml(html);
        if (recipe) {
          recipes.push(recipe);
        }
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
      }
    }

    // Reset the input so the same files can be selected again
    event.target.value = '';

    if (recipes.length === 0) {
      // Show modal with empty preview
      setPreview({ added: [], updated: [], skipped: [] });
      setParsedRecipes([]);
      setIsModalOpen(true);
      return;
    }

    // Generate preview
    const importPreview = previewImport(recipes);
    setPreview(importPreview);
    setParsedRecipes(recipes);
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    if (parsedRecipes.length > 0) {
      importRecipes(parsedRecipes);
      onImportComplete();
    }
    setIsModalOpen(false);
    setPreview(null);
    setParsedRecipes([]);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPreview(null);
    setParsedRecipes([]);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        <Upload className="w-4 h-4" />
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      {preview && (
        <ImportPreviewModal
          isOpen={isModalOpen}
          preview={preview}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
