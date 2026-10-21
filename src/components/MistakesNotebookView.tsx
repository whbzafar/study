/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const MistakesNotebookView: React.FC = () => {
  const { mistakes, questions, startPracticeSession, resolveMistake, setActiveTab } = useApp();

  const allMistakes = Object.values(mistakes);
  const unresolvedMistakes = allMistakes.filter((m) => !m.isResolved);
  const resolvedMistakes = allMistakes.filter((m) => m.isResolved);

  const unresolvedQuestions = unresolvedMistakes
    .map((m) => questions.find((q) => q.id === m.questionId))
    .filter(Boolean) as typeof questions;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Wrong-Answer Notebook
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated spaced-repetition notebook of questions you answered incorrectly during test sessions.
          </p>
        </div>

        {unresolvedQuestions.length > 0 && (
          <button
            onClick={() => startPracticeSession(undefined, 'revision', unresolvedQuestions)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Revise All Mistakes ({unresolvedQuestions.length})
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Unresolved Errors</div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">
            {unresolvedMistakes.length}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Mastered & Resolved</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {resolvedMistakes.length}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-slate-500">Mastery Rate</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {allMistakes.length > 0
              ? `${+((resolvedMistakes.length / allMistakes.length) * 100).toFixed(0)}%`
              : '100%'}
          </div>
        </div>
      </div>

      {/* Mistakes List */}
      {unresolvedMistakes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Your Notebook Is Clean!</h3>
            <p className="text-xs text-slate-500">
              You have no unresolved mistakes. As you practice more past papers, any questions you miss will be tracked here for spaced review.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('papers')}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Practice New Papers
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {unresolvedMistakes.map((record) => {
            const q = questions.find((item) => item.id === record.questionId);
            if (!q) return null;

            return (
              <div
                key={record.questionId}
                className="bg-white rounded-xl border border-red-200 p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Failed {record.timesFailed} {record.timesFailed === 1 ? 'time' : 'times'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.subject}</span>
                  </div>

                  <span className="font-mono text-slate-400">
                    Last: {new Date(record.lastAttemptedAt).toLocaleDateString()}
                  </span>
                </div>

                <div
                  dir={q.language === 'Urdu' ? 'rtl' : 'ltr'}
                  className={`text-sm font-semibold text-slate-900 ${
                    q.language === 'Urdu' ? 'font-urdu text-base' : ''
                  }`}
                >
                  {q.questionText}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt) => {
                    const wasSelected = record.selectedOption === opt.label;
                    const isCorrect = q.correctOptionLabel === opt.label;

                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : wasSelected
                            ? 'bg-red-50 border-red-300 text-red-900 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center font-mono font-bold text-[10px]">
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                        {isCorrect && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-700 uppercase">
                            Correct Answer
                          </span>
                        )}
                        {wasSelected && !isCorrect && (
                          <span className="ml-auto text-[10px] font-bold text-red-600 uppercase">
                            Your Mistake
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                    <strong className="text-slate-800">Review Note: </strong>
                    {q.explanation}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => resolveMistake(q.id)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors"
                  >
                    Mark as Mastered
                  </button>
                  <button
                    onClick={() => startPracticeSession(undefined, 'learning', [q])}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry This MCQ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
