'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Scissors, Flame, Clock } from 'lucide-react';
import { Step } from '@/lib/types';
import { StepTimer } from './StepTimer';

interface FlowStepProps {
  step: Step;
  showConnector?: boolean;
}

const typeConfig = {
  prep: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: Scissors,
    label: 'Prep',
  },
  cook: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    icon: Flame,
    label: 'Cook',
  },
  rest: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    icon: Clock,
    label: 'Rest',
  },
};

export function FlowStep({ step, showConnector = true }: FlowStepProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = typeConfig[step.type];
  const Icon = config.icon;

  return (
    <div className="relative">
      {/* Connector Line */}
      {showConnector && <div className="absolute left-6 -top-3 w-0.5 h-3 bg-gray-300" />}

      <div className={`${config.bg} ${config.border} border rounded-xl overflow-hidden`}>
        {/* Header - Always visible, clickable */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/50 transition-colors"
        >
          {/* Step Number */}
          <div
            className={`w-8 h-8 rounded-full ${config.badge} flex items-center justify-center text-sm font-semibold`}
          >
            {step.stepNumber}
          </div>

          {/* Type Badge & Icon */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.badge} text-xs font-medium`}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </div>

          {/* Brief instruction preview when collapsed */}
          {!isExpanded && (
            <p className="flex-1 text-sm text-gray-600 truncate">{step.instruction}</p>
          )}

          {/* Timer badge if applicable */}
          {step.timerMinutes > 0 && (
            <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-full">
              {step.timerMinutes} min
            </span>
          )}

          {/* Expand/Collapse indicator */}
          <div className="text-gray-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Full Instruction */}
            <p className="text-gray-700 leading-relaxed">{step.instruction}</p>

            {/* Ingredients */}
            {step.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {step.ingredients.map((ingredient, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-1 bg-white/70 rounded-full text-xs text-gray-600 border border-gray-200"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            )}

            {/* Timer */}
            {step.timerMinutes > 0 && (
              <StepTimer initialMinutes={step.timerMinutes} stepNumber={step.stepNumber} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
