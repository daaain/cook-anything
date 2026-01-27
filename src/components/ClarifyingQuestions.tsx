'use client';

import { HelpCircle, Loader2, SkipForward, X } from 'lucide-react';
import { useState } from 'react';
import type { ClarifyingQuestion, ClarifyingQuestionsResponse, QuestionAnswer } from '@/lib/types';

interface ClarifyingQuestionsProps {
  questionsResponse: ClarifyingQuestionsResponse;
  onSubmit: (answers: QuestionAnswer[]) => void;
  onSkip: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface AnswerState {
  selectedOption: string | null;
  customText: string;
  isOther: boolean;
}

export function ClarifyingQuestions({
  questionsResponse,
  onSubmit,
  onSkip,
  onCancel,
  isSubmitting,
}: ClarifyingQuestionsProps) {
  const { questions, context } = questionsResponse;

  // Initialise answer state for each question
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const initial: Record<string, AnswerState> = {};
    for (const q of questions) {
      initial[q.id] = { selectedOption: null, customText: '', isOther: false };
    }
    return initial;
  });

  const handleOptionSelect = (questionId: string, optionValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOption: optionValue,
        customText: '',
        isOther: false,
      },
    }));
  };

  const handleOtherSelect = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOption: null,
        customText: prev[questionId]?.customText || '',
        isOther: true,
      },
    }));
  };

  const handleCustomTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        customText: text,
      },
    }));
  };

  const handleSubmit = () => {
    const questionAnswers: QuestionAnswer[] = questions.map((q) => {
      const answer = answers[q.id];
      return {
        questionId: q.id,
        selectedOption: answer?.isOther ? null : (answer?.selectedOption ?? null),
        customText: answer?.isOther ? answer.customText : undefined,
      };
    });
    onSubmit(questionAnswers);
  };

  // Check if all questions have been answered
  const allAnswered = questions.every((q) => {
    const answer = answers[q.id];
    if (answer?.isOther) {
      return answer.customText.trim().length > 0;
    }
    return answer?.selectedOption !== null;
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          Quick Questions
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Context message */}
      {context && (
        <p className="text-sm text-gray-600 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {context}
        </p>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question) => (
          <QuestionItem
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onOptionSelect={(value) => handleOptionSelect(question.id, value)}
            onOtherSelect={() => handleOtherSelect(question.id)}
            onCustomTextChange={(text) => handleCustomTextChange(question.id, text)}
            disabled={isSubmitting}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onSkip}
          disabled={isSubmitting}
          className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-4 h-4" />
          Skip
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
            allAnswered && !isSubmitting
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Create Recipe'
          )}
        </button>
      </div>
    </div>
  );
}

interface QuestionItemProps {
  question: ClarifyingQuestion;
  answer: AnswerState | undefined;
  onOptionSelect: (value: string) => void;
  onOtherSelect: () => void;
  onCustomTextChange: (text: string) => void;
  disabled: boolean;
}

function QuestionItem({
  question,
  answer,
  onOptionSelect,
  onOtherSelect,
  onCustomTextChange,
  disabled,
}: QuestionItemProps) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700 mb-2">{question.question}</legend>
      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = !answer?.isOther && answer?.selectedOption === option;
          return (
            <label
              key={option}
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={isSelected}
                onChange={() => onOptionSelect(option)}
                disabled={disabled}
                className="accent-amber-500"
              />
              <span className="text-gray-800">{option}</span>
            </label>
          );
        })}

        {/* "Other" option */}
        <label
          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
            answer?.isOther
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name={question.id}
            value="__other__"
            checked={answer?.isOther ?? false}
            onChange={onOtherSelect}
            disabled={disabled}
            className="mt-0.5 accent-amber-500"
          />
          <div className="flex-1">
            <span className="text-gray-800">Other</span>
            {answer?.isOther && (
              <input
                type="text"
                value={answer.customText}
                onChange={(e) => onCustomTextChange(e.target.value)}
                placeholder="Enter your preference..."
                disabled={disabled}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-50"
              />
            )}
          </div>
        </label>
      </div>
    </fieldset>
  );
}
