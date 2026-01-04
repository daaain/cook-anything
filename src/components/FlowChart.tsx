'use client';

import { Users, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import type { Recipe } from '@/lib/types';
import { FlowStep } from './FlowStep';
import { ParallelSteps } from './ParallelSteps';

interface FlowChartProps {
  recipe: Recipe;
}

export function FlowChart({ recipe }: FlowChartProps) {
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{recipe.title}</h1>
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isMuted
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
            title={isMuted ? 'Unmute timers' : 'Mute timers'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isMuted ? 'Muted' : 'Sound on'}
          </button>
        </div>
        {recipe.servings && (
          <div className="flex items-center gap-2 text-gray-500 mt-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">{recipe.servings}</span>
          </div>
        )}
      </div>

      {/* Flow Steps */}
      <div className="space-y-4">
        {recipe.flowGroups.map((group, index) => (
          <div key={`group-${group.steps[0]?.stepNumber ?? index}`}>
            {group.parallel ? (
              <ParallelSteps
                group={group}
                showConnector={(group.steps[0]?.stepNumber ?? 1) > 1}
                isMuted={isMuted}
              />
            ) : (
              group.steps.map((step) => (
                <div key={step.stepNumber} className="mb-4">
                  <FlowStep step={step} showConnector={step.stepNumber > 1} isMuted={isMuted} />
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
