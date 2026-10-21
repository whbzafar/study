/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Flame,
  Target,
  Award,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { SUBJECTS_LIST } from '../data/seedData';

export const ProgressAnalyticsView: React.FC = () => {
  const { stats, recentAttempts, questions, papers } = useApp();

  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      studentStats: stats,
      attemptsSummary: recentAttempts.map((a) => ({
        id: a.id,
        mode: a.mode,
        date: new Date(a.startTime).toLocaleDateString(),
        score: a.score,
        accuracy: a.accuracy,
        totalQuestions: a.totalQuestions,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ExamPilot_Pakistan_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Study Progress & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Empirical preparation metrics based strictly on your logged test submissions.
          </p>
        </div>

        <button
          onClick={handleExportReport}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-2xs shrink-0"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Performance Report
        </button>
      </div>

      {/* Main KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Overall Accuracy</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 mt-2">
            {stats.accuracy}%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            {stats.correctCount} correct of {stats.attemptedCount} attempts
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Unique Questions</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 mt-2">
            {stats.uniqueAttempted}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Unique past paper MCQs solved
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-600 mt-2">
            {stats.streakDays} {stats.streakDays === 1 ? 'Day' : 'Days'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Continuous daily preparation
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Total Exam Sessions</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 mt-2">
            {recentAttempts.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Timed and learning sets completed
          </div>
        </div>
      </div>

      {/* Two Column Layout: Subject Mastery & Attempt Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Subject Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Subject Bank Coverage
            </h2>
            <span className="text-xs text-slate-500">
              Based on available question inventory
            </span>
          </div>

          <div className="space-y-4">
            {SUBJECTS_LIST.map((sub) => {
              const subQuestions = questions.filter((q) => q.subject === sub.name);
              const percentage = Math.min(100, Math.round((subQuestions.length / questions.length) * 100));

              return (
                <div key={sub.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{sub.name}</span>
                    <span className="font-mono text-slate-500">
                      {subQuestions.length} MCQs ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, percentage * 2.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Attempt History Log */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">
            Session History Log
          </h2>

          {recentAttempts.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No examination logs recorded yet. Complete any paper or mock test to view detailed outcomes here.
            </p>
          ) : (
            <div className="space-y-3">
              {recentAttempts.slice(0, 6).map((att) => (
                <div
                  key={att.id}
                  className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span className="capitalize">{att.mode.replace('_', ' ')} Mode</span>
                    <span className="font-mono text-emerald-700">
                      {att.score !== undefined ? `${att.score} pts` : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>
                      {new Date(att.startTime).toLocaleDateString()} at{' '}
                      {new Date(att.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-mono">
                      {att.accuracy !== undefined ? `${att.accuracy}% accuracy` : ''} · {att.totalQuestions} questions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
