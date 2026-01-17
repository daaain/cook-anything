'use client';

import {
  AlertCircle,
  ClipboardPaste,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resizeImage } from '@/lib/image-utils';
import { processRecipeLocal } from '@/lib/local-api';
import {
  getApiEndpoint,
  getCustomModel,
  getMeasureSystem,
  getModel,
  getOAuthToken,
  getProviderType,
  getServings,
  setMeasureSystem as saveMeasureSystem,
  setServings as saveServings,
} from '@/lib/storage';
import type { ImageData, MeasureSystem, Message, ProcessRecipeRequest, Recipe } from '@/lib/types';

interface RecipeUploaderProps {
  onRecipeProcessed: (recipe: Recipe) => void;
  conversationHistory?: Message[];
  initialMeasureSystem?: MeasureSystem;
  initialServings?: number;
}

export function RecipeUploader({
  onRecipeProcessed,
  conversationHistory = [],
  initialMeasureSystem,
  initialServings,
}: RecipeUploaderProps) {
  const [images, setImages] = useState<{ data: ImageData; preview: string }[]>([]);
  const [adjustments, setAdjustments] = useState('');
  const [measureSystem, setMeasureSystem] = useState<MeasureSystem>('metric');
  const [servings, setServings] = useState(4);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load preferences on mount - use initial values if provided (for editing), otherwise load from storage
  useEffect(() => {
    // Check if we have the necessary authentication based on provider type
    const providerType = getProviderType();
    const hasAuth = providerType === 'openai-local' ? true : !!getOAuthToken(); // Local doesn't need token
    setHasToken(hasAuth);
    setMeasureSystem(initialMeasureSystem ?? getMeasureSystem());
    setServings(initialServings ?? getServings());
  }, [initialMeasureSystem, initialServings]);

  // Persist measure system changes to local storage
  const handleMeasureSystemChange = (system: MeasureSystem) => {
    setMeasureSystem(system);
    saveMeasureSystem(system);
  };

  // Persist servings changes to local storage
  const handleServingsChange = (value: number) => {
    const newServings = Math.max(1, value);
    setServings(newServings);
    saveServings(newServings);
  };

  // Helper function to process a single image file into base64 + preview
  const processImageFile = useCallback(
    async (file: File): Promise<{ data: ImageData; preview: string } | null> => {
      if (!file.type.startsWith('image/')) return null;

      // Resize large images to reduce payload size
      const resizedBlob = await resizeImage(file);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data without the data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(resizedBlob);
      });

      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(resizedBlob);
      });

      return {
        data: { base64, mediaType: resizedBlob.type },
        preview,
      };
    },
    [],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newImages: { data: ImageData; preview: string }[] = [];

      for (const file of Array.from(files)) {
        const processed = await processImageFile(file);
        if (processed) {
          newImages.push(processed);
        }
      }

      setImages((prev) => [...prev, ...newImages]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processImageFile],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle keyboard paste (Ctrl+V / Cmd+V) for images
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (isProcessing) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Check if clipboard contains any images
      const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      // Don't intercept if focus is on the textarea (let text paste work normally)
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'TEXTAREA') return;

      e.preventDefault();

      const newImages: { data: ImageData; preview: string }[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          const processed = await processImageFile(file);
          if (processed) {
            newImages.push(processed);
          }
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
    },
    [isProcessing, processImageFile],
  );

  // Programmatic paste for mobile button - uses Clipboard API
  const handlePasteFromClipboard = useCallback(async () => {
    if (isProcessing) return;

    try {
      const clipboardItems = await navigator.clipboard.read();
      const newImages: { data: ImageData; preview: string }[] = [];

      for (const clipboardItem of clipboardItems) {
        // Find image types in clipboard item
        const imageType = clipboardItem.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await clipboardItem.getType(imageType);
          const file = new File([blob], 'pasted-image', { type: imageType });
          const processed = await processImageFile(file);
          if (processed) {
            newImages.push(processed);
          }
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      } else {
        setError('No image found in clipboard. Try copying an image first.');
      }
    } catch {
      // Clipboard API failed - likely permission denied or not supported
      setError('Unable to access clipboard. Try using Ctrl+V (or Cmd+V on Mac) instead.');
    }
  }, [isProcessing, processImageFile]);

  // Global paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleSubmit = async () => {
    // Allow either images or text instructions (or both)
    if (images.length === 0 && !adjustments.trim()) {
      setError('Please add recipe images or enter a recipe description');
      return;
    }

    const providerType = getProviderType();

    // Check authentication based on provider type
    if (providerType === 'claude') {
      const oauthToken = getOAuthToken();
      if (!oauthToken) {
        setError('Please set your OAuth token in Settings first');
        return;
      }
    }
    // For openai-local, no authentication check needed

    setError(null);
    setIsProcessing(true);

    try {
      let recipe: Recipe;

      if (providerType === 'openai-local') {
        // Client-side processing for local OpenAI API (direct browser to localhost)
        const result = await processRecipeLocal({
          apiEndpoint: getApiEndpoint(),
          customModel: getCustomModel() || undefined,
          images: images.map((img) => img.data),
          instructions: adjustments || undefined,
          conversationHistory,
          measureSystem,
          servings,
        });

        if (!result.success || !result.recipe) {
          throw new Error(result.error || 'Failed to process recipe');
        }

        recipe = result.recipe;
      } else {
        // Server-side processing for Claude (needs CLI and OAuth)
        const requestBody: Partial<ProcessRecipeRequest> = {
          images: images.map((img) => img.data),
          instructions: adjustments || undefined,
          conversationHistory,
          measureSystem,
          servings,
          providerType,
          oauthToken: getOAuthToken() || undefined,
          model: getModel(),
        };

        const response = await fetch('/api/process-recipe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to process recipe');
        }

        recipe = result.recipe;
      }

      onRecipeProcessed(recipe);
      setImages([]);
      setAdjustments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit = (images.length > 0 || adjustments.trim()) && !isProcessing;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-500" />
        Create Recipe Flow
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          disabled={isProcessing}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Paste image from clipboard"
        >
          <ClipboardPaste className="w-4 h-4" />
          Paste
        </button>
      </h2>

      {/* Auth Warning */}
      {hasToken === false && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">Authentication required</p>
            <p className="text-amber-700">
              Please{' '}
              <a href="/settings" className="underline font-medium hover:text-amber-900">
                set your OAuth token in Settings
              </a>{' '}
              to use recipe analysis.
            </p>
          </div>
        </div>
      )}

      {/* Image Upload Area */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="recipe-images"
            className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isProcessing
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400'
            }`}
          >
            <input
              ref={fileInputRef}
              id="recipe-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={isProcessing}
              className="hidden"
            />
            <Upload
              className={`w-10 h-10 mx-auto mb-3 ${isProcessing ? 'text-gray-400' : 'text-amber-500'}`}
            />
            <p className={`font-medium ${isProcessing ? 'text-gray-500' : 'text-gray-700'}`}>
              Upload recipe screenshots or ingredients photos (optional)
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Or only enter text below to create a recipe without images
            </p>
          </label>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Images have no natural unique ID
              <div key={index} className="relative group aspect-square">
                <Image
                  src={img.preview}
                  alt={`Recipe image ${index + 1}`}
                  fill
                  className="object-cover rounded-lg"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={isProcessing}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <label
              htmlFor="recipe-images-add"
              className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg ${
                isProcessing
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-amber-300 bg-amber-50/50 cursor-pointer hover:bg-amber-50'
              }`}
            >
              <input
                id="recipe-images-add"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />
              <ImagePlus
                className={`w-6 h-6 ${isProcessing ? 'text-gray-400' : 'text-amber-500'}`}
              />
              <span className={`text-xs mt-1 ${isProcessing ? 'text-gray-400' : 'text-gray-500'}`}>
                Add more
              </span>
            </label>
          </div>
        )}

        {/* Measure System & Servings */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Measure System Toggle */}
          <div className="flex-1">
            <span id="measurements-label" className="block text-sm font-medium text-gray-700 mb-2">
              Measurements
            </span>
            <div
              className="flex rounded-lg border border-gray-200 overflow-hidden"
              role="radiogroup"
              aria-labelledby="measurements-label"
            >
              <button
                type="button"
                onClick={() => handleMeasureSystemChange('metric')}
                disabled={isProcessing}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  measureSystem === 'metric'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                Metric
              </button>
              <button
                type="button"
                onClick={() => handleMeasureSystemChange('american')}
                disabled={isProcessing}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  measureSystem === 'american'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                US/Imperial
              </button>
            </div>
          </div>

          {/* Servings Input */}
          <div className="flex-1">
            <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-2">
              Servings
            </label>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <input
                type="number"
                id="servings"
                min={1}
                max={100}
                value={servings}
                onChange={(e) => handleServingsChange(parseInt(e.target.value, 10) || 1)}
                disabled={isProcessing}
                className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Recipe Text / Adjustments Input */}
        <div>
          <label htmlFor="adjustments" className="block text-sm font-medium text-gray-700 mb-2">
            {images.length > 0 ? 'Recipe Adjustments (optional)' : 'Recipe Text or Instructions'}
          </label>
          <textarea
            id="adjustments"
            value={adjustments}
            onChange={(e) => setAdjustments(e.target.value)}
            disabled={isProcessing}
            placeholder={
              images.length > 0
                ? "E.g., 'Make it vegetarian', 'Less spicy'..."
                : "Enter your recipe, ingredients list, or describe what you'd like to cook..."
            }
            className={`w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
              images.length > 0 ? 'h-20' : 'h-32'
            }`}
          />
          {images.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Paste a recipe, list ingredients, or describe what you want to make
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
            canSubmit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Recipe...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Create Recipe Flow
            </>
          )}
        </button>
      </div>
    </div>
  );
}
