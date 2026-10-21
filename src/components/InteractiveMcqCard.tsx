/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Question, AnswerOption } from '../types';
import {
  CheckCircle2,
  XCircle,
  CircleDot,
  Bookmark,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Edit3,
  ArrowRight,
  Trophy,
} from 'lucide-react';

interface InteractiveMcqCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  initialSelectedOption?: 'A' | 'B' | 'C' | 'D' | 'E';
  onAnswerSubmit: (optionId: 'A' | 'B' | 'C' | 'D' | 'E') => void;
  onBookmarkToggle?: () => void;
  isBookmarked?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onVerifyAnswerKey?: (optionId: 'A' | 'B' | 'C' | 'D' | 'E') => void;
  onFinish?: () => void;
  instantFeedback?: boolean;
}

export const InteractiveMcqCard: React.FC<InteractiveMcqCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  initialSelectedOption,
  onAnswerSubmit,
  onBookmarkToggle,
  isBookmarked,
  onPrevious,
  onNext,
  hasPrevious = true,
  hasNext = true,
  onVerifyAnswerKey,
  onFinish,
  instantFeedback = true,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E' | ''>(
    initialSelectedOption || ''
  );
  const [isChecked, setIsChecked] = useState<boolean>(Boolean(initialSelectedOption));
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  // Sync state if question or initialSelectedOption changes
  React.useEffect(() => {
    setSelectedAnswer(initialSelectedOption || '');
    setIsChecked(Boolean(initialSelectedOption));
  }, [question.id, initialSelectedOption]);

  const isVerifiedKey = Boolean(
    question.correctOptionLabel && question.verificationStatus === 'Verified'
  );
  const isCorrect = isChecked && isVerifiedKey && selectedAnswer === question.correctOptionLabel;
  const isIncorrect = isChecked && isVerifiedKey && selectedAnswer !== question.correctOptionLabel;

  const handleSelectOption = (optionId: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setSelectedAnswer(optionId);
    if (instantFeedback) {
      setIsChecked(true);
      onAnswerSubmit(optionId);
    } else {
      setIsChecked(false);
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    setIsChecked(true);
    onAnswerSubmit(selectedAnswer as 'A' | 'B' | 'C' | 'D' | 'E');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 font-mono">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <span aria-hidden="true">·</span>
          <span>{question.subject}</span>
          {question.sourcePage && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Page {question.sourcePage}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isVerifiedKey ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded text-[11px] whitespace-nowrap border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {isChecked ? `Official Key: Option ${question.correctOptionLabel}` : 'Key: Verified'}
            </span>
          ) : (
            <button
              onClick={() => setShowVerifyModal(true)}
              className="text-amber-800 font-semibold flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap border border-amber-200"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Awaiting Verification
              <Edit3 className="w-3 h-3 ml-0.5" />
            </button>
          )}

          {onBookmarkToggle && (
            <button
              onClick={onBookmarkToggle}
              className={`p-1.5 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'border-slate-200 text-slate-400 hover:text-slate-700'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Question Title */}
      <div
        dir={question.language === 'Urdu' ? 'rtl' : 'ltr'}
        className={`text-lg sm:text-xl font-bold text-slate-900 leading-relaxed ${
          question.language === 'Urdu' ? 'font-urdu text-2xl' : ''
        }`}
      >
        {question.questionText}
      </div>

      {/* Interactive Options Stack (as requested in Master Spec) */}
      <div className="space-y-3">
        {question.options.map((option) => {
          const isOptionCorrect = isChecked && isVerifiedKey && option.label === question.correctOptionLabel;
          const isOptionUserWrong = isChecked && isVerifiedKey && selectedAnswer === option.label && !isOptionCorrect;
          const isSelected = selectedAnswer === option.label;

          // Styling logic matching the interactive example from user specification
          let bgClass = 'bg-white hover:bg-slate-50';
          let borderClass = 'border-slate-200';
          let textClass = 'text-slate-800';

          if (isOptionCorrect) {
            bgClass = 'bg-emerald-50/70';
            borderClass = 'border-emerald-500 ring-1 ring-emerald-500';
            textClass = 'text-emerald-950 font-semibold';
          } else if (isOptionUserWrong) {
            bgClass = 'bg-red-50/70';
            borderClass = 'border-red-400 ring-1 ring-red-400';
            textClass = 'text-red-950 font-medium';
          } else if (isSelected) {
            bgClass = 'bg-slate-50';
            borderClass = 'border-slate-900 ring-1 ring-slate-900';
            textClass = 'text-slate-950 font-semibold';
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelectOption(option.label)}
              className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between gap-4 text-left ${bgClass} ${borderClass}`}
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div
                  className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isOptionCorrect
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isOptionUserWrong
                      ? 'bg-red-600 text-white border-red-600'
                      : isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {option.label}
                </div>
                <div
                  dir={question.language === 'Urdu' ? 'rtl' : 'ltr'}
                  className={`text-sm ${textClass} ${
                    question.language === 'Urdu' ? 'font-urdu text-base' : ''
                  }`}
                >
                  {option.text}
                </div>
              </div>

              {/* Status Icons */}
              <div className="shrink-0">
                {isOptionCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isOptionUserWrong ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : isSelected ? (
                  <CircleDot className="w-5 h-5 text-slate-800" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Answer Feedback Banner (appears after Check Answer is clicked) */}
      {isChecked && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            !isVerifiedKey
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : isCorrect
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 text-sm">
            {!isVerifiedKey ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Recorded (Awaiting Verified Key)
              </>
            ) : isCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Correct Answer!
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                Incorrect Answer.
              </>
            )}
          </div>

          {isVerifiedKey && question.correctOptionLabel && (
            <div className="font-medium">
              Official Answer Key: <strong className="font-mono">Option {question.correctOptionLabel}</strong>
              {question.options.find((o) => o.label === question.correctOptionLabel) && (
                <span> — {question.options.find((o) => o.label === question.correctOptionLabel)?.text}</span>
              )}
            </div>
          )}

          {!isVerifiedKey && (
            <p className="text-xs text-amber-800">
              The source paper did not have an unambiguous official answer key printed for this item. Click "Provide Verified Key" to verify it.
            </p>
          )}

          {question.explanation && (
            <div className="pt-2 border-t border-slate-200/50 text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Explanation: </strong>
              {question.explanation}
            </div>
          )}
        </div>
      )}

      {/* Check Answer or Next Question Button */}
      {!isChecked ? (
        <button
          onClick={handleCheckAnswer}
          disabled={!selectedAnswer}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Check Answer
        </button>
      ) : hasNext ? (
        <button
          onClick={onNext}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
        >
          <span>Next Question</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onFinish}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4" />
          <span>View Results Summary →</span>
        </button>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors"
        >
          Previous
        </button>

        <span className="text-xs text-slate-400 font-mono">
          {questionIndex + 1} / {totalQuestions}
        </span>

        {hasNext ? (
          <button
            onClick={onNext}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>
        )}
      </div>

      {/* Inline Modal to Provide/Verify Answer Key */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Provide Verified Answer Key
            </h3>
            <p className="text-xs text-slate-500">
              Select the authoritative correct option for Question #{question.questionNumber}:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (onVerifyAnswerKey) {
                      onVerifyAnswerKey(opt.label);
                    }
                    setShowVerifyModal(false);
                  }}
                  className="p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-2 text-left transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-100 font-mono font-bold flex items-center justify-center text-[11px]">
                    {opt.label}
                  </span>
                  <span className="truncate">{opt.text}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
