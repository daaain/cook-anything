'use client';

import { AlertCircle, CheckCircle, Plus, RefreshCw, XCircle } from 'lucide-react';
import type { ImportResult } from '@/lib/storage';

interface ImportPreviewModalProps {
  isOpen: boolean;
  preview: ImportResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreviewModal({
  isOpen,
  preview,
  onConfirm,
  onCancel,
}: ImportPreviewModalProps) {
  if (!isOpen) return null;

  const totalRecipes = preview.added.length + preview.updated.length + preview.skipped.length;
  const hasChanges = preview.added.length > 0 || preview.updated.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Import Preview</h2>
          <p className="text-sm text-gray-500 mt-1">
            {totalRecipes} recipe{totalRecipes !== 1 ? 's' : ''} found in selected files
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
          {preview.added.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <Plus className="w-4 h-4" />
                <span className="font-medium">
                  {preview.added.length} new recipe{preview.added.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {preview.added.map((recipe) => (
                  <li key={recipe.slug || recipe.title} className="text-sm text-gray-600">
                    {recipe.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.updated.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="w-4 h-4" />
                <span className="font-medium">{preview.updated.length} will be updated</span>
              </div>
              <ul className="ml-6 space-y-1">
                {preview.updated.map((recipe) => (
                  <li key={recipe.slug || recipe.title} className="text-sm text-gray-600">
                    {recipe.title}
                    {recipe.savedAt && (
                      <span className="text-gray-400 ml-1">
                        (newer: {new Date(recipe.savedAt).toLocaleDateString()})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.skipped.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">{preview.skipped.length} will be skipped</span>
              </div>
              <ul className="ml-6 space-y-1">
                {preview.skipped.map((recipe) => (
                  <li key={recipe.slug || recipe.title} className="text-sm text-gray-400">
                    {recipe.title}
                    <span className="ml-1">(local version is newer)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalRecipes === 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span>No valid recipes found in the selected files.</span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {hasChanges && (
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Import {preview.added.length + preview.updated.length} Recipe
              {preview.added.length + preview.updated.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
