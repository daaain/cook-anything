'use client';

import { GitBranch } from 'lucide-react';
import type { FlowGroup } from '@/lib/recipe';
import { FlowStep } from './FlowStep';

interface ParallelStepsProps {
  group: FlowGroup;
  showConnector?: boolean;
  isMuted?: boolean;
}

export function ParallelSteps({
  group,
  showConnector = true,
  isMuted = false,
}: ParallelStepsProps) {
  return (
    <div className="relative">
      {/* Connector Line */}
      {showConnector && <div className="absolute left-6 -top-3 w-0.5 h-3 bg-gray-300" />}

      <div className="border-2 border-dashed border-amber-300 rounded-xl p-4 bg-amber-50/30">
        {/* Parallel Label */}
        <div className="flex items-center gap-2 mb-4 text-amber-700">
          <GitBranch className="w-4 h-4" />
          <span className="text-sm font-medium">These can be done in parallel</span>
        </div>

        {/* Parallel Steps */}
        <div className="grid gap-3 sm:grid-cols-2">
          {group.steps.map((step) => (
            <div key={step.stepNumber} className="min-w-0">
              <FlowStep step={step} showConnector={false} isMuted={isMuted} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
