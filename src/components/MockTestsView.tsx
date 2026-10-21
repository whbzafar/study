/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react';
import { ExaminingBodyId } from '../types';

export const MockTestsView: React.FC = () => {
  const { papers, questions, startPracticeSession, examiningBodies } = useApp();

  const [selectedBody, setSelectedBody] = useState<ExaminingBodyId>('PPSC');
  const [selectedDuration, setSelectedDuration] = useState<number>(30); // minutes
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [enableNegativeMarking, setEnableNegativeMarking] = useState<boolean>(true);

  const startCustomMockTest = () => {
    // Pick questions matching the examining body or random pool
    const bodyPapers = papers.filter((p) => p.examiningBodyId === selectedBody);
    const bodyPaperIds = new Set(bodyPapers.map((p) => p.id));
    let pool = questions.filter((q) => bodyPaperIds.has(q.paperId));

    if (pool.length === 0) {
      pool = questions;
    }

    // Shuffle and pick
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selectedQ = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    startPracticeSession(undefined, 'exam', selectedQ);
  };

  const bodyData = examiningBodies.find((b) => b.id === selectedBody);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Competitive Mock Examination Simulations
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Full test simulation under realistic commission conditions with negative marking and strict timers.
        </p>
      </div>

      {/* Mock Test Configurator Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Test Setup Form */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wide">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Configurable Exam Simulation</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Design Your Practice Test
          </h2>

          {/* Select Examining Body */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Target Testing Commission
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {examiningBodies.map((body) => (
                <button
                  key={body.id}
                  onClick={() => {
                    setSelectedBody(body.id);
                    setEnableNegativeMarking(body.negativeMarkingDefault > 0);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    selectedBody === body.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {body.name}
                </button>
              ))}
            </div>
            {bodyData && (
              <p className="text-xs text-slate-500 pt-1">
                {bodyData.fullName} · {bodyData.province}
              </p>
            )}
          </div>

          {/* Question Count & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Question Count
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={10}>10 Questions (Quick Mock)</option>
                <option value={20}>20 Questions (Standard Drill)</option>
                <option value={50}>50 Questions (Half Paper)</option>
                <option value={100}>100 Questions (Full Length Simulation)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Duration Limit
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes (Official PPSC/FPSC)</option>
              </select>
            </div>
          </div>

          {/* Negative Marking Toggle */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900">
                Enable Negative Marking Penalty
              </div>
              <div className="text-[11px] text-slate-500">
                {selectedBody === 'PPSC' || selectedBody === 'SPSC'
                  ? 'Standard provincial rule: 0.25 penalty per wrong response'
                  : 'Commission default policy applied to final score'}
              </div>
            </div>

            <input
              type="checkbox"
              checked={enableNegativeMarking}
              onChange={(e) => setEnableNegativeMarking(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
          </div>

          {/* Launch Button */}
          <button
            onClick={startCustomMockTest}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Timed Mock Examination
          </button>
        </div>

        {/* Right Column: Pre-configured Standard Test Templates */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Standard Commission Test Templates
          </h2>

          {papers.slice(0, 3).map((paper) => (
            <div
              key={paper.id}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-emerald-700">{paper.examiningBodyId}</span>
                <span className="font-mono">{paper.year}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{paper.title}</h3>
              <p className="text-xs text-slate-500">{paper.subjectOrCategory}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="font-mono text-slate-600">
                  {paper.durationMinutes} mins · {paper.negativeMarking > 0 ? `-${paper.negativeMarking} neg` : 'No neg'}
                </span>
                <button
                  onClick={() => startPracticeSession(paper.id, 'exam')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs transition-colors"
                >
                  Start Simulation
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
