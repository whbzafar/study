/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Award,
  Send,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question } from '../types';
import { calculateExamScore } from '../utils/scoring';

export const PracticeEngineView: React.FC = () => {
  const {
    currentAttempt,
    papers,
    questions,
    bookmarks,
    toggleBookmark,
    recordQuestionAnswer,
    finishCurrentAttempt,
    exitPracticeSession,
    startPracticeSession,
    setActiveTab,
  } = useApp();

  // If no attempt is active, prompt to select a paper or start quick practice
  if (!currentAttempt) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">No Active Practice Session</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Select an archived examination paper, a specific subject, or start a random practice set from our question bank.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setActiveTab('papers')}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Browse Past Papers
          </button>
          <button
            onClick={() => startPracticeSession(undefined, 'learning')}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Start Quick Practice (10 MCQs)
          </button>
        </div>
      </div>
    );
  }

  // Get active paper and questions
  const paper = currentAttempt.paperId
    ? papers.find((p) => p.id === currentAttempt.paperId)
    : undefined;

  const sessionQuestions: Question[] = currentAttempt.paperId
    ? questions.filter((q) => q.paperId === currentAttempt.paperId)
    : questions.slice(0, currentAttempt.totalQuestions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(() => {
    return (paper?.durationMinutes || 30) * 60;
  });
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);
  const [customAiExplanation, setCustomAiExplanation] = useState<string | null>(null);

  const currentQ = sessionQuestions[currentIndex] || sessionQuestions[0];
  const totalQuestions = sessionQuestions.length;
  const currentAnswer = currentAttempt.answers[currentQ?.id];
  const isBookmarked = Boolean(bookmarks[currentQ?.id]);

  // Exam Mode Timer countdown
  useEffect(() => {
    if (currentAttempt.mode !== 'exam' || currentAttempt.isCompleted) return;

    const timer = setInterval(() => {
      setExamTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentAttempt.mode, currentAttempt.isCompleted]);

  // Trigger confetti when completed with good accuracy
  const handleFinishSession = () => {
    const finished = finishCurrentAttempt();
    if (finished && (finished.accuracy || 0) >= 70) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  // Request pedagogical AI explanation from backend route
  const requestAiExplanation = async () => {
    if (!currentQ || aiExplanationLoading) return;
    setAiExplanationLoading(true);
    setCustomAiExplanation(null);
    try {
      const res = await fetch('/api/gemini/explain-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: currentQ.questionText,
          options: currentQ.options,
          correctOptionLabel: currentQ.correctOptionLabel,
          subject: currentQ.subject,
          language: currentQ.language,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setCustomAiExplanation(data.explanation);
      }
    } catch (err) {
      console.error('Error fetching AI explanation:', err);
    } finally {
      setAiExplanationLoading(false);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Score breakdown calculation for completed sessions
  const scoreBreakdown = calculateExamScore(
    sessionQuestions,
    currentAttempt.answers,
    currentAttempt.negativeMarkingRate
  );

  // If session is completed, render authoritative results & review scorecard
  if (currentAttempt.isCompleted) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Attempt Summary & Scorecard
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {paper?.title || 'Practice Set Completed'}
            </h2>
            <p className="text-sm text-slate-500">
              {currentAttempt.mode === 'exam'
                ? `Timed Exam Mode · Negative marking penalty of ${currentAttempt.negativeMarkingRate} per wrong answer`
                : 'Learning Practice Mode'}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold font-mono text-slate-900">
                {scoreBreakdown.attempted} / {scoreBreakdown.totalQuestions}
              </div>
              <div className="text-xs text-slate-500">Attempted</div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {scoreBreakdown.correct}
              </div>
              <div className="text-xs text-emerald-800 font-medium">Correct Answers</div>
            </div>

            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold font-mono text-red-700">
                {scoreBreakdown.incorrect}
              </div>
              <div className="text-xs text-red-800 font-medium">
                Incorrect ({scoreBreakdown.penaltyPoints > 0 ? `-${scoreBreakdown.penaltyPoints} pts` : 'No penalty'})
              </div>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-lg">
              <div className="text-2xl font-bold font-mono text-white">
                {scoreBreakdown.netScore}
              </div>
              <div className="text-xs text-slate-300 font-medium">
                Net Score ({scoreBreakdown.accuracyPercentage}%)
              </div>
            </div>
          </div>

          {scoreBreakdown.unscoredOrUnverified > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {scoreBreakdown.unscoredOrUnverified} question(s) had unverified departmental answer keys and were excluded from scoring penalty.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => startPracticeSession(paper?.id, currentAttempt.mode)}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake This Paper
            </button>
            <button
              onClick={() => setActiveTab('mistakes')}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
            >
              Review Mistakes Notebook
            </button>
            <button
              onClick={exitPracticeSession}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              Back to Library
            </button>
          </div>
        </div>

        {/* Detailed Review of All Questions */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Question-by-Question Review</h3>
          {sessionQuestions.map((q, idx) => {
            const userAns = currentAttempt.answers[q.id];
            const isAnswered = Boolean(userAns?.selectedOptionLabel);
            const isCorrect = userAns?.isCorrect;
            const isUnverified = !q.correctOptionLabel || q.verificationStatus === 'Unverified';

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border p-5 space-y-3 ${
                  isUnverified
                    ? 'border-slate-200'
                    : isCorrect
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isAnswered
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900">Question {idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.subject}</span>
                  </div>
                  <div>
                    {isUnverified ? (
                      <span className="text-amber-700 font-medium">Unverified Key</span>
                    ) : isCorrect ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : isAnswered ? (
                      <span className="text-red-600 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    ) : (
                      <span className="text-slate-400">Unanswered</span>
                    )}
                  </div>
                </div>

                <div
                  dir={q.language === 'Urdu' ? 'rtl' : 'ltr'}
                  className={`text-sm font-semibold text-slate-900 ${
                    q.language === 'Urdu' ? 'font-urdu text-base' : ''
                  }`}
                >
                  {q.questionText}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = userAns?.selectedOptionLabel === opt.label;
                    const isRightAnswer = q.correctOptionLabel === opt.label;

                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2.5 ${
                          isRightAnswer
                            ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 font-semibold'
                            : isSelected
                            ? 'bg-red-100/70 border-red-400 text-red-950 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center font-mono font-bold text-[10px]">
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                        {isRightAnswer && (
                          <span className="ml-auto text-[10px] font-bold text-emerald-700 uppercase">
                            Official Key
                          </span>
                        )}
                        {isSelected && !isRightAnswer && (
                          <span className="ml-auto text-[10px] font-bold text-red-600 uppercase">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    <strong className="text-slate-800">Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active question solving view
  const isAnswered = Boolean(currentAnswer?.selectedOptionLabel);
  const isLearningMode = currentAttempt.mode === 'learning';
  const isExamMode = currentAttempt.mode === 'exam';
  const isQuestionUnverified = !currentQ.correctOptionLabel || currentQ.verificationStatus === 'Unverified';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Practice Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={exitPracticeSession}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
            title="Exit Session"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              {paper?.title || 'Interactive Practice Session'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
              <span className="capitalize">{currentAttempt.mode.replace('_', ' ')} Mode</span>
              <span aria-hidden="true">·</span>
              <span>{currentQ.subject}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer for Exam Mode */}
          {isExamMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-lg font-mono font-bold text-xs border border-red-200">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(examTimeRemaining)}</span>
            </div>
          )}

          {/* Question Grid Navigator Toggle */}
          <button
            onClick={() => setShowQuestionGrid(!showQuestionGrid)}
            className="px-2.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-mono font-medium"
          >
            Q {currentIndex + 1} / {totalQuestions}
          </button>

          {/* Bookmark Button */}
          <button
            onClick={() => toggleBookmark(currentQ.id)}
            className={`p-2 rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Question Grid Modal/Drawer */}
      {showQuestionGrid && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Question Navigator</span>
            <button
              onClick={() => setShowQuestionGrid(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {sessionQuestions.map((q, idx) => {
              const ans = currentAttempt.answers[q.id];
              const isSelected = idx === currentIndex;
              const hasAnswer = Boolean(ans?.selectedOptionLabel);

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowQuestionGrid(false);
                  }}
                  className={`h-9 rounded-md text-xs font-mono font-bold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-slate-900 bg-slate-900 text-white'
                      : hasAnswer
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Question Header & Verification Badge */}
        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 font-mono">
              Question {currentQ.questionNumber || currentIndex + 1} of {totalQuestions}
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentQ.subject}</span>
          </div>

          <div className="flex items-center gap-2">
            {isQuestionUnverified ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> Unverified Key
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Gazette
              </span>
            )}
          </div>
        </div>

        {/* Question Text with RTL support for Urdu */}
        <div
          dir={currentQ.language === 'Urdu' ? 'rtl' : 'ltr'}
          className={`text-base sm:text-lg font-bold text-slate-900 leading-relaxed ${
            currentQ.language === 'Urdu' ? 'font-urdu text-xl' : ''
          }`}
        >
          {currentQ.questionText}
        </div>

        {/* Answer Options */}
        <div className="space-y-3 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = currentAnswer?.selectedOptionLabel === opt.label;
            const isCorrect = isLearningMode && isAnswered && currentQ.correctOptionLabel === opt.label;
            const isWrongSelected = isLearningMode && isSelected && currentAnswer?.isCorrect === false;

            return (
              <button
                key={opt.id}
                onClick={() => recordQuestionAnswer(currentQ.id, opt.label)}
                disabled={isLearningMode && isAnswered}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-4 ${
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                    : isWrongSelected
                    ? 'bg-red-50 border-red-500 text-red-950 font-medium'
                    : isSelected
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                      isSelected && !isLearningMode
                        ? 'bg-white/20 text-white border-transparent'
                        : isCorrect
                        ? 'bg-emerald-600 text-white border-transparent'
                        : isWrongSelected
                        ? 'bg-red-600 text-white border-transparent'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span
                    dir={currentQ.language === 'Urdu' ? 'rtl' : 'ltr'}
                    className={`text-sm ${
                      currentQ.language === 'Urdu' ? 'font-urdu text-base' : ''
                    }`}
                  >
                    {opt.text}
                  </span>
                </div>

                {isLearningMode && isAnswered && (
                  <div>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {isWrongSelected && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Unverified answer key warning */}
        {isQuestionUnverified && isAnswered && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold">Unverified Departmental Key: </strong>
              <span>
                This past paper item has not yet been verified against the official provincial gazette. Your response is recorded, but it has not been scored correct or incorrect.
              </span>
            </div>
          </div>
        )}

        {/* Immediate Explanation in Learning Mode */}
        {isLearningMode && isAnswered && (
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-900">
                  {currentAnswer?.isCorrect ? 'Correct Answer!' : 'Incorrect'}
                </span>
                {currentQ.correctOptionLabel && (
                  <span className="text-slate-500 font-mono">
                    (Official Key: Option {currentQ.correctOptionLabel})
                  </span>
                )}
              </div>

              <button
                onClick={requestAiExplanation}
                disabled={aiExplanationLoading}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
              >
                {aiExplanationLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Deep AI Explanation
                  </>
                )}
              </button>
            </div>

            {currentQ.explanation && (
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentQ.explanation}
              </p>
            )}

            {customAiExplanation && (
              <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-700 space-y-1">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                  Pedagogical Exam Insight:
                </div>
                <p className="leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {customAiExplanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Question Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              Next Question
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinishSession}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Finish & Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
