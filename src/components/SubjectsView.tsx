/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Landmark,
  BookOpen,
  Globe,
  Atom,
  Newspaper,
  SpellCheck,
  Scroll,
  Calculator,
  Cpu,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { SUBJECTS_LIST } from '../data/seedData';
import { SubjectCategory } from '../types';

export const SubjectsView: React.FC = () => {
  const {
    questions,
    startPracticeSession,
    selectedSubjectFilter,
    setSelectedSubjectFilter,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<SubjectCategory | 'All'>(
    selectedSubjectFilter || 'All'
  );

  const filteredQuestions = questions.filter((q) => {
    if (activeCategory === 'All') return true;
    return q.subject === activeCategory;
  });

  const getSubjectIcon = (name: SubjectCategory) => {
    switch (name) {
      case 'Pakistan Affairs':
        return <Landmark className="w-5 h-5 text-emerald-600" />;
      case 'Islamic Studies':
        return <BookOpen className="w-5 h-5 text-amber-600" />;
      case 'General Knowledge':
        return <Globe className="w-5 h-5 text-blue-600" />;
      case 'Everyday Science':
        return <Atom className="w-5 h-5 text-purple-600" />;
      case 'Current Affairs':
        return <Newspaper className="w-5 h-5 text-red-600" />;
      case 'English':
        return <SpellCheck className="w-5 h-5 text-indigo-600" />;
      case 'Urdu':
        return <Scroll className="w-5 h-5 text-teal-600" />;
      case 'Mathematics & Reasoning':
        return <Calculator className="w-5 h-5 text-orange-600" />;
      case 'Computer Science':
        return <Cpu className="w-5 h-5 text-cyan-600" />;
      default:
        return <Globe className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Subject-Wise Question Banks
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Target individual core disciplines tested across all Pakistani recruitment examinations.
        </p>
      </div>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SUBJECTS_LIST.map((sub) => {
          const subQuestions = questions.filter((q) => q.subject === sub.name);
          const isSelected = activeCategory === sub.name;

          return (
            <div
              key={sub.name}
              className={`bg-white rounded-xl border p-5 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    {getSubjectIcon(sub.name)}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {subQuestions.length} MCQs
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1.5">{sub.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{sub.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveCategory(isSelected ? 'All' : sub.name)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  {isSelected ? 'View All' : 'Filter MCQs'}
                </button>
                <button
                  onClick={() => startPracticeSession(undefined, 'learning', subQuestions)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Practice Subject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtered Question List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              Questions in {activeCategory} ({filteredQuestions.length})
            </span>
          </div>
          {activeCategory !== 'All' && (
            <button
              onClick={() => setActiveCategory('All')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-mono font-bold text-slate-800">Q{idx + 1}</span>
                  <span aria-hidden="true">·</span>
                  <span>{q.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span className={q.verificationStatus === 'Verified' ? 'text-emerald-700 font-medium' : 'text-amber-600'}>
                    {q.verificationStatus}
                  </span>
                </div>
                <div
                  dir={q.language === 'Urdu' ? 'rtl' : 'ltr'}
                  className={`font-semibold text-slate-900 ${
                    q.language === 'Urdu' ? 'font-urdu text-sm' : ''
                  }`}
                >
                  {q.questionText}
                </div>
              </div>

              <button
                onClick={() => startPracticeSession(undefined, 'learning', [q])}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-md shadow-2xs shrink-0"
              >
                Solve Question
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
