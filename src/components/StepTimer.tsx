'use client';

import { Check, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface StepTimerProps {
  initialMinutes: number;
  stepNumber: number;
  ingredients: string[];
  isMuted?: boolean;
}

// Strip emojis from text for cleaner TTS output
function stripEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu,
      '',
    )
    .trim();
}

function speakCompletion(ingredients: string[], stepNumber: number) {
  if (!('speechSynthesis' in window)) return;

  // Strip emojis from ingredients for cleaner speech
  const cleanIngredients = ingredients.map(stripEmojis).filter((i) => i.length > 0);

  let message: string;
  if (cleanIngredients.length === 0) {
    message = `Step ${stepNumber} is complete`;
  } else if (cleanIngredients.length === 1) {
    message = `${cleanIngredients[0]} ready on step ${stepNumber}`;
  } else {
    const last = cleanIngredients[cleanIngredients.length - 1];
    const rest = cleanIngredients.slice(0, -1).join(', ');
    message = `${rest} and ${last} ready on step ${stepNumber}`;
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'en-GB';

  // Try to find a better quality voice
  const voices = speechSynthesis.getVoices();
  const preferredVoice =
    voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')),
    ) ?? voices.find((v) => v.lang.startsWith('en-GB'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  speechSynthesis.speak(utterance);
}

export function StepTimer({
  initialMinutes,
  stepNumber,
  ingredients,
  isMuted = false,
}: StepTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSpeakRef = useRef(false);

  // Timestamp-based tracking to handle background tab throttling
  const startTimestampRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const start = useCallback(() => {
    if (remainingSeconds <= 0) return;
    startTimestampRef.current = Date.now();
    setIsRunning(true);
  }, [remainingSeconds]);

  const pause = useCallback(() => {
    if (startTimestampRef.current !== null) {
      elapsedBeforePauseRef.current += Math.floor((Date.now() - startTimestampRef.current) / 1000);
      startTimestampRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsComplete(false);
    setRemainingSeconds(totalSeconds);
    startTimestampRef.current = null;
    elapsedBeforePauseRef.current = 0;
  }, [totalSeconds]);

  const adjustTime = useCallback(
    (delta: number) => {
      if (isRunning) return;

      const newTotal = Math.max(30, totalSeconds + delta * 30);
      setTotalSeconds(newTotal);
      setRemainingSeconds(newTotal);
      setIsComplete(false);
    },
    [isRunning, totalSeconds],
  );

  useEffect(() => {
    const startTime = startTimestampRef.current;
    if (isRunning && startTime !== null) {
      const updateTimer = () => {
        const elapsedSinceStart = Math.floor((Date.now() - startTime) / 1000);
        const totalElapsed = elapsedBeforePauseRef.current + elapsedSinceStart;
        const newRemaining = Math.max(0, totalSeconds - totalElapsed);

        setRemainingSeconds(newRemaining);

        if (newRemaining <= 0) {
          setIsRunning(false);
          setIsComplete(true);
          shouldSpeakRef.current = true;
          startTimestampRef.current = null;
        }
      };

      // Update immediately in case we're catching up from background
      updateTimer();

      intervalRef.current = setInterval(updateTimer, 1000);

      // Also update immediately when tab becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateTimer();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, totalSeconds]);

  // Handle speech separately to avoid React Strict Mode double-invocation
  useEffect(() => {
    if (isComplete && shouldSpeakRef.current && !isMuted) {
      shouldSpeakRef.current = false;
      speakCompletion(ingredients, stepNumber);
    }
  }, [isComplete, ingredients, stepNumber, isMuted]);

  return (
    <div
      className={`rounded-lg p-3 transition-colors ${isComplete ? 'bg-green-100' : 'bg-gray-50'}`}
    >
      <div className="flex items-center gap-3">
        {/* Timer Display */}
        <div className="flex items-center gap-2">
          {!isRunning && !isComplete && (
            <button
              type="button"
              onClick={() => adjustTime(-1)}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={totalSeconds <= 30}
            >
              <Minus className="w-4 h-4" />
            </button>
          )}

          <div
            className={`font-mono text-lg font-semibold ${
              isComplete ? 'text-green-700' : 'text-gray-800'
            }`}
          >
            {isComplete ? (
              <span className="flex items-center gap-1">
                <Check className="w-5 h-5" />
                Done!
              </span>
            ) : (
              formatTime(remainingSeconds)
            )}
          </div>

          {!isRunning && !isComplete && (
            <button
              type="button"
              onClick={() => adjustTime(1)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isComplete ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-1">
          {isComplete ? (
            <button
              type="button"
              onClick={reset}
              className="p-2 rounded-full bg-green-200 text-green-700 hover:bg-green-300"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={isRunning ? pause : start}
                className={`p-2 rounded-full ${
                  isRunning
                    ? 'bg-amber-200 text-amber-700 hover:bg-amber-300'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
                title={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={reset}
                className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-1">Step {stepNumber} timer</div>
    </div>
  );
}
