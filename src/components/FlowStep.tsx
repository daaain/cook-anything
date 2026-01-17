'use client';

import { ChevronDown, ChevronUp, Clock, Flame, Scissors } from 'lucide-react';
import { useState } from 'react';
import type { Step } from '@/lib/types';
import { StepTimer } from './StepTimer';

interface FlowStepProps {
  step: Step;
  showConnector?: boolean;
  isMuted?: boolean;
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

export function FlowStep({ step, showConnector = true, isMuted = false }: FlowStepProps) {
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
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left hover:bg-white/50 transition-colors min-w-0"
        >
          {/* Step Number */}
          <div
            className={`w-8 h-8 rounded-full ${config.badge} flex items-center justify-center text-sm font-semibold shrink-0`}
          >
            {step.stepNumber}
          </div>

          {/* Type Badge & Icon */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.badge} text-xs font-medium shrink-0`}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </div>

          {/* Brief instruction preview when collapsed */}
          {!isExpanded && (
            <p className="flex-1 text-sm text-gray-600 truncate min-w-0">{step.instruction}</p>
          )}

          {/* Timer badge if applicable */}
          {step.timerMinutes > 0 && (
            <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-full shrink-0 whitespace-nowrap">
              {step.timerMinutes} min
            </span>
          )}

          {/* Expand/Collapse indicator */}
          <div className="text-gray-400 shrink-0">
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
                {step.ingredients.map((ingredient) => (
                  <span
                    key={ingredient}
                    className="inline-block px-2 py-1 bg-white/70 rounded-full text-center text-s text-gray-600 border border-gray-200"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            )}

            {/* Equipment */}
            {step.equipment && step.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {step.equipment.map((item) => (
                  <span
                    key={item}
                    className="inline-block px-2 py-1 bg-emerald-50 rounded-full text-center text-s text-emerald-700 border border-emerald-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Timer */}
            {step.timerMinutes > 0 && (
              <StepTimer
                initialMinutes={step.timerMinutes}
                stepNumber={step.stepNumber}
                ingredients={step.ingredients}
                isMuted={isMuted}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
