'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, ImagePlus, Loader2, Sparkles, Users, AlertCircle } from 'lucide-react';
import { ImageData, Recipe, Message, MeasureSystem } from '@/lib/types';
import {
  getOAuthToken,
  getModel,
  getMeasureSystem,
  setMeasureSystem as saveMeasureSystem,
  getServings,
  setServings as saveServings,
} from '@/lib/storage';

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
    setHasToken(!!getOAuthToken());
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

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: { data: ImageData; preview: string }[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data without the data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(file);
      });

      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newImages.push({
        data: { base64, mediaType: file.type },
        preview,
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    // Allow either images or text instructions (or both)
    if (images.length === 0 && !adjustments.trim()) {
      setError('Please add recipe images or enter a recipe description');
      return;
    }

    const oauthToken = getOAuthToken();
    if (!oauthToken) {
      setError('Please set your OAuth token in Settings first');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/process-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: images.map((img) => img.data),
          instructions: adjustments || undefined,
          conversationHistory,
          measureSystem,
          servings,
          oauthToken,
          model: getModel(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to process recipe');
      }

      onRecipeProcessed(result.recipe);
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
      </h2>

      {/* Auth Warning */}
      {hasToken === false && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
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
              Upload recipe screenshots (optional)
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Or enter text below to create a recipe without images
            </p>
          </label>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={img.preview}
                  alt={`Recipe image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Measurements</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
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
                onChange={(e) => handleServingsChange(parseInt(e.target.value) || 1)}
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
