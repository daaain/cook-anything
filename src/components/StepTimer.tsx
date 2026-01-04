'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Check } from 'lucide-react';

interface StepTimerProps {
  initialMinutes: number;
  stepNumber: number;
}

export function StepTimer({ initialMinutes, stepNumber }: StepTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const start = useCallback(() => {
    if (remainingSeconds <= 0) return;
    setIsRunning(true);
  }, [remainingSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsComplete(false);
    setRemainingSeconds(totalSeconds);
  }, [totalSeconds]);

  const adjustTime = useCallback(
    (delta: number) => {
      if (isRunning) return;

      const newTotal = Math.max(60, totalSeconds + delta * 60);
      setTotalSeconds(newTotal);
      setRemainingSeconds(newTotal);
      setIsComplete(false);
    },
    [isRunning, totalSeconds],
  );

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            // Play a sound or vibrate
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remainingSeconds]);

  return (
    <div
      className={`rounded-lg p-3 transition-colors ${isComplete ? 'bg-green-100' : 'bg-gray-50'}`}
    >
      <div className="flex items-center gap-3">
        {/* Timer Display */}
        <div className="flex items-center gap-2">
          {!isRunning && !isComplete && (
            <button
              onClick={() => adjustTime(-1)}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              disabled={totalSeconds <= 60}
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
            <button onClick={() => adjustTime(1)} className="p-1 text-gray-400 hover:text-gray-600">
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
              onClick={reset}
              className="p-2 rounded-full bg-green-200 text-green-700 hover:bg-green-300"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
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
