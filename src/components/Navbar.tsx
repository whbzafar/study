/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Compass,
  BookOpen,
  FileText,
  Bookmark,
  AlertTriangle,
  BarChart3,
  UploadCloud,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, userRole, setUserRole, bookmarks, mistakes } = useApp();

  const bookmarkCount = Object.keys(bookmarks).length;
  const unresolvedMistakesCount = Object.values(mistakes).filter((m) => !m.isResolved).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Bar Contract: Brand Zone (1-line) - Nav Links - Primary Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:bg-emerald-700 transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                ExamPilot <span className="text-emerald-700">Pakistan</span>
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'papers'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Past Papers
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'practice'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Practice
            </button>
            <button
              onClick={() => setActiveTab('mocks')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'mocks'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Mock Tests
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'subjects'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Subjects
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'bookmarks'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Bookmarks
              {bookmarkCount > 0 && (
                <span className="font-mono text-slate-500">({bookmarkCount})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('mistakes')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'mistakes'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Mistakes
              {unresolvedMistakesCount > 0 && (
                <span className="font-mono text-amber-600 font-semibold">({unresolvedMistakesCount})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'progress'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              My Progress
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Ingestion Hub
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'admin'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-emerald-700 hover:bg-emerald-50/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            )}
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Settings
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action + Role Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Role Switcher Pill for seamless evaluation */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setUserRole('student')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  userRole === 'student'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Student Mode"
              >
                Student
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  userRole === 'admin'
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Admin Mode"
              >
                Admin
              </button>
            </div>

            <button
              onClick={() => setActiveTab('practice')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Start Practicing
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation strip */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto py-2 border-t border-slate-100 text-xs font-medium scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('papers')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'papers' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Past Papers
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'practice' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setActiveTab('mocks')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'mocks' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Mock Tests
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'subjects' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Subjects
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'bookmarks' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Bookmarks ({bookmarkCount})
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'mistakes' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Mistakes ({unresolvedMistakesCount})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-md whitespace-nowrap ${
              activeTab === 'upload' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Ingest Files
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1 rounded-md whitespace-nowrap ${
                activeTab === 'admin' ? 'bg-emerald-600 text-white' : 'text-emerald-700 bg-emerald-50'
              }`}
            >
              Admin
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
