/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Trash2,
  Layers,
  Sparkles,
  Save,
  Eye,
  FileText,
  Search,
} from 'lucide-react';
import { Question } from '../types';

export const AdminDashboardView: React.FC = () => {
  const {
    papers,
    questions,
    processingJobs,
    updateQuestion,
    deleteQuestion,
    updateProcessingJobStatus,
  } = useApp();

  const [filterTab, setFilterTab] = useState<'review' | 'all' | 'jobs'>('review');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Questions needing review (unverified or low confidence)
  const reviewQueue = questions.filter(
    (q) => q.verificationStatus === 'Needs Review' || q.verificationStatus === 'Unverified'
  );

  const displayedQuestions = filterTab === 'review' ? reviewQueue : questions;
  const filteredList = displayedQuestions.filter((q) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return q.questionText.toLowerCase().includes(term) || q.subject.toLowerCase().includes(term);
  });

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    updateQuestion(editingQuestion.id, editingQuestion);
    setEditingQuestion(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Administrative Command Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Question Bank Verification & Review
          </h1>
          <p className="text-sm text-slate-500">
            Verify digitized past papers, resolve disputed answer keys, and manage commission records.
          </p>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Pending Review Queue</div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {reviewQueue.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Scanned items requiring verification</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Digitized MCQs</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {questions.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Across all provincial papers</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Archived Papers</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {papers.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Collections 2021–2026</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Active Ingestion Jobs</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {processingJobs.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">OCR conversion tasks</div>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setFilterTab('review')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterTab === 'review'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Queue ({reviewQueue.length})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Questions ({questions.length})
          </button>
          <button
            onClick={() => setFilterTab('jobs')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterTab === 'jobs'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PDF Jobs ({processingJobs.length})
          </button>
        </div>

        {filterTab !== 'jobs' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by question text or subject..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Editing Modal / Drawer */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit & Verify Question #{editingQuestion.questionNumber}
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Question Text
                </label>
                <textarea
                  value={editingQuestion.questionText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Subject Category
                  </label>
                  <select
                    value={editingQuestion.subject}
                    onChange={(e: any) =>
                      setEditingQuestion({ ...editingQuestion, subject: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  >
                    <option value="Pakistan Affairs">Pakistan Affairs</option>
                    <option value="Islamic Studies">Islamic Studies</option>
                    <option value="General Knowledge">General Knowledge</option>
                    <option value="Everyday Science">Everyday Science</option>
                    <option value="Current Affairs">Current Affairs</option>
                    <option value="English">English</option>
                    <option value="Urdu">Urdu</option>
                    <option value="Mathematics & Reasoning">Mathematics & Reasoning</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Official Answer Key
                  </label>
                  <select
                    value={editingQuestion.correctOptionLabel || ''}
                    onChange={(e: any) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        correctOptionLabel: e.target.value || undefined,
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  >
                    <option value="">-- Unverified / None --</option>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Answer Options
                </label>
                <div className="space-y-2">
                  {editingQuestion.options.map((opt, oIdx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-100 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {opt.label}
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[oIdx] = { ...opt, text: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Departmental Explanation / Source
                </label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  rows={2}
                  placeholder="Official gazette reference, historical context, or scientific rule..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Verification Status
                </label>
                <select
                  value={editingQuestion.verificationStatus}
                  onChange={(e: any) =>
                    setEditingQuestion({ ...editingQuestion, verificationStatus: e.target.value })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-800"
                >
                  <option value="Verified">Verified Official Key</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Unverified">Unverified (Incomplete/Scanned)</option>
                  <option value="Disputed">Disputed Answer</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Update Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {filterTab === 'jobs' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Past Paper & Video Ingestion Pipelines</h3>
            <span className="text-xs text-slate-500 font-mono">{processingJobs.length} jobs total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {processingJobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-1 max-w-md">
                  <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 uppercase">
                      {job.jobType === 'video' ? 'VIDEO' : 'PDF'}
                    </span>
                    <span>{job.fileName}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {job.examiningBodyId} · {job.examName} · {job.year}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-600">
                    {job.extractedQuestionsCount} MCQs ({Math.round(job.confidenceScore * 100)}% conf)
                  </span>
                  <span
                    className={`font-semibold px-2.5 py-1 rounded text-[11px] ${
                      job.status === 'Verified' || job.status === 'Published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : job.status === 'Needs Review'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {job.status}
                  </span>
                  {job.status === 'Needs Review' && (
                    <button
                      onClick={() => updateProcessingJobStatus(job.id, 'Verified')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition-colors"
                    >
                      Approve & Verify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Showing {filteredList.length} questions
            </span>
            <span className="text-slate-400">
              Click "Edit" on any question to modify options, set verified key, or resolve dispute.
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredList.map((q) => (
              <div
                key={q.id}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <span className="font-bold text-slate-900 font-mono">Q#{q.questionNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-800">{q.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.language}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        q.verificationStatus === 'Verified'
                          ? 'text-emerald-700'
                          : q.verificationStatus === 'Needs Review'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {q.verificationStatus}
                    </span>
                    {q.correctOptionLabel && (
                      <span className="font-mono text-slate-700 font-bold ml-1">
                        [Key: Option {q.correctOptionLabel}]
                      </span>
                    )}
                  </div>

                  <div
                    dir={q.language === 'Urdu' ? 'rtl' : 'ltr'}
                    className={`font-semibold text-slate-900 ${
                      q.language === 'Urdu' ? 'font-urdu text-base' : ''
                    }`}
                  >
                    {q.questionText}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-1.5 rounded border flex items-center gap-1.5 ${
                          opt.label === q.correctOptionLabel
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-mono font-bold">{opt.label}:</span>
                        <span className="truncate">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit & Verify
                  </button>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
