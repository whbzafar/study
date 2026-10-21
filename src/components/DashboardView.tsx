/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  FileText,
  Target,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  Compass,
  Layers,
} from 'lucide-react';
import { SUBJECTS_LIST } from '../data/seedData';

export const DashboardView: React.FC = () => {
  const {
    papers,
    questions,
    bookmarks,
    mistakes,
    recentAttempts,
    stats,
    setActiveTab,
    startPracticeSession,
    setSelectedSubjectFilter,
  } = useApp();

  const unresolvedMistakes = Object.values(mistakes).filter((m) => !m.isResolved);
  const bookmarkList = Object.values(bookmarks);
  const latestPaper = papers[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Student Preparation Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to ExamPilot Pakistan
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Track your progress across PPSC, FPSC, and provincial testing bodies. Solve past papers with immediate feedback or take timed mock tests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (latestPaper) {
                startPracticeSession(latestPaper.id, 'learning');
              } else {
                setActiveTab('papers');
              }
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            Continue Practicing
          </button>
          <button
            onClick={() => setActiveTab('mocks')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            Take Mock Exam
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Available Papers</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.totalPapers}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across <strong className="text-slate-700">{questions.length}</strong> total questions
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Unique MCQs Attempted</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {stats.uniqueAttempted}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-mono">{stats.attemptedCount}</span> total submissions logged
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Practice Accuracy</span>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {stats.accuracy}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-mono text-emerald-600">{stats.correctCount}</span> correct answers
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Current Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
            {stats.streakDays} {stats.streakDays === 1 ? 'Day' : 'Days'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Daily consistency tracker
          </div>
        </div>
      </div>

      {/* Two-Column Action Section: Revision Deck + Recently Opened */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Revision Deck */}
        <div className="lg:col-span-7 space-y-6">
          {/* Wrong Answers / Mistakes Alert Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">
                  Mistakes Requiring Revision
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('mistakes')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View all ({unresolvedMistakes.length}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {unresolvedMistakes.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">No unresolved mistakes!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Questions you answer incorrectly during practice will automatically appear here for focused revision.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unresolvedMistakes.slice(0, 3).map((mistake) => {
                  const q = questions.find((item) => item.id === mistake.questionId);
                  if (!q) return null;
                  return (
                    <div
                      key={mistake.questionId}
                      className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 max-w-[80%]">
                        <div className="text-[11px] font-medium text-slate-500">
                          {q.subject} · Failed {mistake.timesFailed}x
                        </div>
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {q.questionText}
                        </p>
                      </div>
                      <button
                        onClick={() => startPracticeSession(undefined, 'revision', [q])}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-md shadow-2xs shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookmarked Questions Quick Deck */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Bookmarked Questions ({bookmarkList.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('bookmarks')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                Open Bookmarks <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {bookmarkList.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">
                  Click the bookmark icon on any question during practice to save it for quick revision.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarkList.slice(0, 3).map((bm) => {
                  const q = questions.find((item) => item.id === bm.questionId);
                  if (!q) return null;
                  return (
                    <div
                      key={bm.questionId}
                      className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 max-w-[80%]">
                        <div className="text-[11px] font-medium text-emerald-700">
                          {q.subject} · {q.language}
                        </div>
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {q.questionText}
                        </p>
                      </div>
                      <button
                        onClick={() => startPracticeSession(undefined, 'learning', [q])}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-md shadow-2xs shrink-0"
                      >
                        Practice
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subject Breakdown & Recent Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Subject Mastery Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Subject Library
              </h2>
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                All Subjects <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {SUBJECTS_LIST.slice(0, 5).map((sub) => {
                const subQuestions = questions.filter((q) => q.subject === sub.name);
                return (
                  <div
                    key={sub.name}
                    onClick={() => {
                      setSelectedSubjectFilter(sub.name);
                      setActiveTab('subjects');
                    }}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{sub.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {subQuestions.length} available MCQs
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">Practice</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Attempt History */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Recent Practice History
            </h2>
            {recentAttempts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No completed attempts yet. Start solving past papers to track your scores.
              </p>
            ) : (
              <div className="space-y-3">
                {recentAttempts.slice(0, 3).map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 capitalize">
                        {att.mode.replace('_', ' ')} Mode
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {new Date(att.startTime).toLocaleDateString()} · {att.totalQuestions} questions
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-700">
                        {att.score !== undefined ? `${att.score} pts` : 'In Progress'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {att.accuracy !== undefined ? `${att.accuracy}% acc` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
