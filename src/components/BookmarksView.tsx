/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bookmark,
  Trash2,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export const BookmarksView: React.FC = () => {
  const { bookmarks, questions, toggleBookmark, startPracticeSession, setActiveTab } = useApp();
  const [search, setSearch] = useState('');

  const bookmarkEntries = Object.values(bookmarks);
  const bookmarkedQuestions = bookmarkEntries
    .map((bm) => {
      const q = questions.find((item) => item.id === bm.questionId);
      return q ? { ...q, savedAt: bm.savedAt, notes: bm.notes } : null;
    })
    .filter(Boolean) as (typeof questions[0] & { savedAt: number; notes?: string })[];

  const filtered = bookmarkedQuestions.filter((q) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return q.questionText.toLowerCase().includes(term) || q.subject.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bookmarked Questions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Questions saved during practice sessions for quick reference and targeted revision.
          </p>
        </div>

        {bookmarkedQuestions.length > 0 && (
          <button
            onClick={() => startPracticeSession(undefined, 'learning', bookmarkedQuestions)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Practice All Bookmarks ({bookmarkedQuestions.length})
          </button>
        )}
      </div>

      {/* Search Filter */}
      {bookmarkedQuestions.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved questions..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Bookmarks List */}
      {bookmarkedQuestions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Bookmarks Saved Yet</h3>
            <p className="text-xs text-slate-500">
              When practicing questions, click the bookmark icon on any question to add it to your personal revision library.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('papers')}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Browse Past Papers
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">{q.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span>{q.language}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-400">
                    Saved {new Date(q.savedAt).toLocaleDateString()}
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

                {q.explanation && (
                  <p className="text-xs text-slate-500 line-clamp-1">
                    <strong className="text-slate-700">Key: </strong>
                    {q.explanation}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => startPracticeSession(undefined, 'learning', [q])}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors"
                >
                  Solve Now
                </button>
                <button
                  onClick={() => toggleBookmark(q.id)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-md border border-slate-200 hover:bg-red-50 transition-colors"
                  title="Remove Bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
