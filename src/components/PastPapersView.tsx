/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Filter,
  FileText,
  Clock,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Calendar,
  Layers,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { Paper } from '../types';

export const PastPapersView: React.FC = () => {
  const {
    papers,
    questions,
    examiningBodies,
    startPracticeSession,
    selectedYearFilter,
    setSelectedYearFilter,
    selectedBodyFilter,
    setSelectedBodyFilter,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'oldest' | 'body' | 'title'>('newest');
  const [activeExpandedPaperId, setActiveExpandedPaperId] = useState<string | null>(null);

  // Extract all distinct years dynamically from database papers
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(papers.map((p) => p.year)));
    return years.sort((a, b) => b - a);
  }, [papers]);

  // Filter papers
  const filteredPapers = useMemo(() => {
    return papers
      .filter((paper) => {
        if (selectedYearFilter && paper.year !== selectedYearFilter) return false;
        if (selectedBodyFilter && paper.examiningBodyId !== selectedBodyFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = paper.title.toLowerCase().includes(q);
          const matchExam = paper.examinationName.toLowerCase().includes(q);
          const matchBody = paper.examiningBodyId.toLowerCase().includes(q);
          const matchSubject = paper.subjectOrCategory.toLowerCase().includes(q);
          if (!matchTitle && !matchExam && !matchBody && !matchSubject) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'newest') return b.year - a.year;
        if (selectedSort === 'oldest') return a.year - b.year;
        if (selectedSort === 'body') return a.examiningBodyId.localeCompare(b.examiningBodyId);
        return a.title.localeCompare(b.title);
      });
  }, [papers, selectedYearFilter, selectedBodyFilter, searchQuery, selectedSort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Past Examination Papers Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hierarchical archive: Year → Commission → Examination → Paper → Question Bank.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
        {/* Search input & Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paper title, examination, subject, or commission..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSort}
              onChange={(e: any) => setSelectedSort(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Sort by Newest Year</option>
              <option value="oldest">Sort by Oldest Year</option>
              <option value="body">Sort by Commission</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>
        </div>

        {/* Year Filter Buttons (Interactive Buttons Allowed per Frontend Guidelines) */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Year:
          </span>
          <button
            onClick={() => setSelectedYearFilter(null)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedYearFilter === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Years
          </button>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYearFilter(selectedYearFilter === year ? null : year)}
              className={`px-3 py-1 text-xs font-medium rounded-md font-mono transition-colors ${
                selectedYearFilter === year
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Commission Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Commission:
          </span>
          <button
            onClick={() => setSelectedBodyFilter(null)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              selectedBodyFilter === null
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Commissions
          </button>
          {examiningBodies.map((body) => (
            <button
              key={body.id}
              onClick={() => setSelectedBodyFilter(selectedBodyFilter === body.id ? null : body.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedBodyFilter === body.id
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {body.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-900 font-mono">{filteredPapers.length}</strong> of{' '}
          <strong className="text-slate-900 font-mono">{papers.length}</strong> archived papers
        </span>
        {(selectedYearFilter || selectedBodyFilter || searchQuery) && (
          <button
            onClick={() => {
              setSelectedYearFilter(null);
              setSelectedBodyFilter(null);
              setSearchQuery('');
            }}
            className="text-emerald-700 hover:underline font-semibold"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No examination papers match your filters</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your year, commission, or search keywords.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPapers.map((paper) => {
            const paperQuestions = questions.filter((q) => q.paperId === paper.id);
            const isExpanded = activeExpandedPaperId === paper.id;

            return (
              <div
                key={paper.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left Metadata & Title */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-emerald-700">{paper.examiningBodyId}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-semibold text-slate-700">{paper.year}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium">{paper.paperNumber}</span>
                      {paper.examDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{paper.examDate}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {paper.title}
                    </h3>

                    <div className="text-xs text-slate-600 font-medium">
                      Examination: <span className="text-slate-800">{paper.examinationName}</span> · Subject: <span className="text-slate-800">{paper.subjectOrCategory}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-700 font-mono">{paperQuestions.length || paper.totalQuestions}</strong> MCQs
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{paper.durationMinutes}</span> mins
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">{paper.verificationStatus}</span>
                      </span>
                      <span className="text-slate-500">
                        Negative Marking:{' '}
                        <span className="font-mono text-slate-700 font-medium">
                          {paper.negativeMarking > 0 ? `-${paper.negativeMarking}` : 'None'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    <button
                      onClick={() =>
                        setActiveExpandedPaperId(isExpanded ? null : paper.id)
                      }
                      className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      {isExpanded ? 'Hide Questions' : 'Inspect MCQs'}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    <button
                      onClick={() => startPracticeSession(paper.id, 'learning')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Start Practice
                    </button>

                    <button
                      onClick={() => startPracticeSession(paper.id, 'exam')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Timed Exam
                    </button>
                  </div>
                </div>

                {/* Expanded Question Sequence Preview */}
                {isExpanded && (
                  <div className="bg-slate-50 p-5 sm:p-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 uppercase tracking-wide">
                        Question Sequence Preview ({paperQuestions.length} Questions)
                      </span>
                      <span className="text-slate-500">
                        Source PDF: <span className="font-mono">{paper.sourcePdfName || 'Digital Ingest'}</span>
                      </span>
                    </div>

                    <div className="space-y-3">
                      {paperQuestions.map((q, qIndex) => (
                        <div
                          key={q.id}
                          className="bg-white p-4 rounded-lg border border-slate-200 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-mono font-bold text-slate-800">
                              Q{q.questionNumber || qIndex + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{q.subject}</span>
                              <span aria-hidden="true">·</span>
                              <span className={q.verificationStatus === 'Verified' ? 'text-emerald-700 font-semibold' : 'text-amber-600'}>
                                {q.verificationStatus}
                              </span>
                            </div>
                          </div>

                          <div
                            dir={q.language === 'Urdu' ? 'rtl' : 'ltr'}
                            className={`font-semibold text-slate-900 ${
                              q.language === 'Urdu' ? 'font-urdu text-sm' : ''
                            }`}
                          >
                            {q.questionText}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={`p-2 rounded border text-slate-700 flex items-center gap-2 ${
                                  opt.label === q.correctOptionLabel
                                    ? 'bg-emerald-50/70 border-emerald-300 font-semibold text-emerald-900'
                                    : 'border-slate-100 bg-slate-50'
                                }`}
                              >
                                <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold font-mono text-[10px]">
                                  {opt.label}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
