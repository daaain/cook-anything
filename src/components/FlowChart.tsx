'use client';

import { Recipe } from '@/lib/types';
import { FlowStep } from './FlowStep';
import { ParallelSteps } from './ParallelSteps';
import { Users } from 'lucide-react';

interface FlowChartProps {
  recipe: Recipe;
}

export function FlowChart({ recipe }: FlowChartProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{recipe.title}</h1>
        {recipe.servings && (
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-4 h-4" />
            <span className="text-sm">{recipe.servings}</span>
          </div>
        )}
      </div>

      {/* Flow Steps */}
      <div className="space-y-4">
        {recipe.flowGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.parallel ? (
              <ParallelSteps group={group} showConnector={groupIndex > 0} />
            ) : (
              group.steps.map((step, stepIndex) => (
                <div key={step.stepNumber} className="mb-4">
                  <FlowStep step={step} showConnector={groupIndex > 0 || stepIndex > 0} />
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
