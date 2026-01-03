'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { ImageData, OAuthToken, Recipe, Message } from '@/lib/types';
import { getAccessToken, getTokenStatus } from '@/lib/token';

interface RecipeUploaderProps {
  token: OAuthToken | null;
  onRecipeProcessed: (recipe: Recipe) => void;
  conversationHistory?: Message[];
}

export function RecipeUploader({ token, onRecipeProcessed, conversationHistory = [] }: RecipeUploaderProps) {
  const [images, setImages] = useState<{ data: ImageData; preview: string }[]>([]);
  const [adjustments, setAdjustments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (images.length === 0) {
      setError('Please add at least one recipe image');
      return;
    }

    if (!token) {
      setError('Please configure your API token in Settings first');
      return;
    }

    const tokenStatus = getTokenStatus(token);
    if (tokenStatus === 'expired') {
      setError('Your API token has expired. Please update it in Settings.');
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
          token: getAccessToken(token),
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

  const tokenStatus = getTokenStatus(token);
  const canSubmit = images.length > 0 && tokenStatus === 'valid' && !isProcessing;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-amber-500" />
        Create Recipe Flow
      </h2>

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
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isProcessing ? 'text-gray-400' : 'text-amber-500'}`} />
            <p className={`font-medium ${isProcessing ? 'text-gray-500' : 'text-gray-700'}`}>
              Upload recipe screenshots
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Tap to add images from your device
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
              <ImagePlus className={`w-6 h-6 ${isProcessing ? 'text-gray-400' : 'text-amber-500'}`} />
              <span className={`text-xs mt-1 ${isProcessing ? 'text-gray-400' : 'text-gray-500'}`}>Add more</span>
            </label>
          </div>
        )}

        {/* Adjustments Input */}
        <div>
          <label htmlFor="adjustments" className="block text-sm font-medium text-gray-700 mb-2">
            Recipe Adjustments (optional)
          </label>
          <textarea
            id="adjustments"
            value={adjustments}
            onChange={(e) => setAdjustments(e.target.value)}
            disabled={isProcessing}
            placeholder="E.g., 'Make it vegetarian', 'Double the recipe', 'Less spicy'..."
            className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Token Warning */}
        {tokenStatus !== 'valid' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            {tokenStatus === 'expired'
              ? 'Your API token has expired. Please update it in Settings.'
              : 'Please configure your API token in Settings to process recipes.'}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
            canSubmit
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-gray-300 cursor-not-allowed'
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
