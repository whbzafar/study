/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Video,
  Clock,
  Search,
  BookOpen,
  FileText,
  CheckCircle2,
  Sparkles,
  Download,
  Play,
  Layers,
} from 'lucide-react';
import { ProcessingJob, Question } from '../types';

interface VideoTranscriptModalProps {
  job: ProcessingJob;
  onClose: () => void;
  onPracticeQuestions?: (questions: Question[]) => void;
}

export const VideoTranscriptModal: React.FC<VideoTranscriptModalProps> = ({
  job,
  onClose,
  onPracticeQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'notes' | 'mcqs'>('transcript');
  const [searchQuery, setSearchQuery] = useState('');

  const transcript = job.transcript;
  const studyNotes = job.studyNotes;
  const questions = job.extractedQuestions || [];
  const videoMeta = job.videoMetadata;

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSegments = (transcript?.segments || []).filter((seg) => {
    if (!searchQuery.trim()) return true;
    return seg.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDownloadTranscript = () => {
    if (!transcript) return;
    const textContent = `ExamPilot Pakistan - Video Lecture Transcript
Lecture: ${job.fileName}
Exam: ${job.examiningBodyId} - ${job.examName} (${job.year})
Duration: ${videoMeta?.durationSeconds ? formatTime(videoMeta.durationSeconds) : 'N/A'}
Date Ingested: ${new Date(job.uploadedAt).toLocaleString()}
------------------------------------------------------------
${(transcript.segments || [])
  .map((s) => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`)
  .join('\n\n')}
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.fileName.replace(/\.[^/.]+$/, '')}_Transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-emerald-700" />
                Video Lecture Ingestion
              </span>
              <span className="text-xs font-mono text-slate-500">
                {videoMeta?.durationSeconds ? formatTime(videoMeta.durationSeconds) : 'Processed'}
              </span>
              {videoMeta?.format && (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-200/80 rounded text-slate-700 uppercase">
                  {videoMeta.format}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{job.fileName}</h2>
            <p className="text-xs text-slate-500">
              {job.examiningBodyId} · {job.examName} ({job.year}) · Audio extracted via FFmpeg & transcribed
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'transcript'
                  ? 'border-emerald-600 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Timestamped Transcript ({transcript?.segments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'border-emerald-600 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Lecture Study Notes & Concepts
            </button>
            <button
              onClick={() => setActiveTab('mcqs')}
              className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'mcqs'
                  ? 'border-emerald-600 text-emerald-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Generated Exam MCQs ({questions.length})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-1">
            <button
              onClick={handleDownloadTranscript}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Export TXT
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TAB 1: TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search keywords in lecture speech (e.g. 'Treaty', 'Constitution', '1935')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                )}
              </div>

              {filteredSegments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No transcript segments match &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredSegments.map((segment) => (
                    <div
                      key={segment.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-colors flex items-start gap-3"
                    >
                      <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 shrink-0">
                        {formatTime(segment.start)}
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-sans">{segment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STUDY NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {studyNotes ? (
                <>
                  <div className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      {studyNotes.title || 'Executive Lecture Summary'}
                    </h3>
                    <p className="text-xs text-emerald-900 leading-relaxed font-sans">
                      {studyNotes.summary}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      High-Yield Examination Key Points
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {(studyNotes.keyPoints || []).map((point, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Suggested Practice Topics
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(studyNotes.suggestedPracticeTopics || []).map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-700 font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Study notes are currently synthesizing from audio transcripts...
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERATED MCQS */}
          {activeTab === 'mcqs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  {questions.length} questions synthesized from lecture topics.
                </p>
                {questions.length > 0 && onPracticeQuestions && (
                  <button
                    onClick={() => {
                      onPracticeQuestions(questions);
                      onClose();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Launch Interactive Practice Test
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-bold text-slate-900">Q#{idx + 1}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium">
                        {q.subject}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900">{q.questionText}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                            opt.label === q.correctOptionLabel
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-mono font-bold text-[11px]">{opt.label})</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                        <span className="font-semibold text-slate-700">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ExamPilot Pakistan Multimodal Ingestion Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
