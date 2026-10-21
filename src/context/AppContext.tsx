/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ExaminingBody,
  Paper,
  Question,
  ProcessingJob,
  BookmarkItem,
  MistakeRecord,
  AttemptSession,
  UserAnswerRecord,
  SubjectCategory,
  PracticeMode,
} from '../types';
import {
  EXAMINING_BODIES,
  INITIAL_PAPERS,
  INITIAL_QUESTIONS,
  INITIAL_PROCESSING_JOBS,
} from '../data/seedData';
import { calculateExamScore, calculateUniqueAttemptedCount, calculateDailyStreak } from '../utils/scoring';

interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: 'student' | 'admin';
  setUserRole: (role: 'student' | 'admin') => void;

  // Data
  examiningBodies: ExaminingBody[];
  papers: Paper[];
  questions: Question[];
  processingJobs: ProcessingJob[];
  bookmarks: Record<string, BookmarkItem>;
  mistakes: Record<string, MistakeRecord>;
  recentAttempts: AttemptSession[];
  currentAttempt: AttemptSession | null;
  activityTimestamps: number[];

  // Practice & Exam Actions
  startPracticeSession: (paperId?: string, mode?: PracticeMode, customQuestions?: Question[]) => void;
  recordQuestionAnswer: (questionId: string, optionLabel: 'A' | 'B' | 'C' | 'D' | 'E') => void;
  finishCurrentAttempt: () => AttemptSession | null;
  exitPracticeSession: () => void;
  toggleBookmark: (questionId: string, notes?: string) => void;
  resolveMistake: (questionId: string) => void;

  // Admin Actions
  addProcessingJob: (job: ProcessingJob) => void;
  updateProcessingJobStatus: (jobId: string, status: ProcessingJob['status']) => void;
  publishJobQuestionsToPaper: (jobId: string) => void;
  refreshJobsFromServer: () => Promise<void>;
  updateQuestion: (questionId: string, updates: Partial<Question>) => void;
  addNewPaperWithQuestions: (paper: Paper, questions: Question[]) => void;
  deleteQuestion: (questionId: string) => void;

  // Selected filters for quick navigation
  selectedYearFilter: number | null;
  setSelectedYearFilter: (year: number | null) => void;
  selectedBodyFilter: string | null;
  setSelectedBodyFilter: (body: string | null) => void;
  selectedSubjectFilter: SubjectCategory | null;
  setSelectedSubjectFilter: (sub: SubjectCategory | null) => void;

  // Computed stats
  stats: {
    totalPapers: number;
    totalQuestions: number;
    attemptedCount: number;
    uniqueAttempted: number;
    correctCount: number;
    accuracy: number;
    streakDays: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PAPERS = 'exampilot_papers_v1';
const STORAGE_KEY_QUESTIONS = 'exampilot_questions_v1';
const STORAGE_KEY_JOBS = 'exampilot_jobs_v1';
const STORAGE_KEY_BOOKMARKS = 'exampilot_bookmarks_v1';
const STORAGE_KEY_MISTAKES = 'exampilot_mistakes_v1';
const STORAGE_KEY_ATTEMPTS = 'exampilot_attempts_v1';
const STORAGE_KEY_TIMESTAMPS = 'exampilot_activity_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student');

  const [papers, setPapers] = useState<Paper[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PAPERS);
      return stored ? JSON.parse(stored) : INITIAL_PAPERS;
    } catch {
      return INITIAL_PAPERS;
    }
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      return stored ? JSON.parse(stored) : INITIAL_QUESTIONS;
    } catch {
      return INITIAL_QUESTIONS;
    }
  });

  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_JOBS);
      return stored ? JSON.parse(stored) : INITIAL_PROCESSING_JOBS;
    } catch {
      return INITIAL_PROCESSING_JOBS;
    }
  });

  const [bookmarks, setBookmarks] = useState<Record<string, BookmarkItem>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [mistakes, setMistakes] = useState<Record<string, MistakeRecord>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MISTAKES);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [recentAttempts, setRecentAttempts] = useState<AttemptSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activityTimestamps, setActivityTimestamps] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TIMESTAMPS);
      return stored ? JSON.parse(stored) : [Date.now()];
    } catch {
      return [Date.now()];
    }
  });

  const [currentAttempt, setCurrentAttempt] = useState<AttemptSession | null>(null);

  // Filters for deep navigation
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | null>(null);
  const [selectedBodyFilter, setSelectedBodyFilter] = useState<string | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<SubjectCategory | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PAPERS, JSON.stringify(papers));
  }, [papers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(processingJobs));
  }, [processingJobs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(mistakes));
  }, [mistakes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(recentAttempts));
  }, [recentAttempts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TIMESTAMPS, JSON.stringify(activityTimestamps));
  }, [activityTimestamps]);

  // Initial jobs sync from server & polling while any job is in active processing
  useEffect(() => {
    refreshJobsFromServer();
    const interval = setInterval(() => {
      const hasActiveJobs = processingJobs.some((j) =>
        ['Queued', 'Uploading', 'Processing', 'Transcribing', 'Extracting', 'Generating MCQs'].includes(j.status)
      );
      if (hasActiveJobs) {
        refreshJobsFromServer();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [processingJobs]);

  // Log activity timestamp
  const logActivity = () => {
    setActivityTimestamps((prev) => [...prev, Date.now()]);
  };

  // Start practice session
  const startPracticeSession = (
    paperId?: string,
    mode: PracticeMode = 'learning',
    customQuestions?: Question[]
  ) => {
    logActivity();
    let targetQuestions: Question[] = [];

    if (customQuestions && customQuestions.length > 0) {
      targetQuestions = customQuestions;
    } else if (paperId) {
      targetQuestions = questions.filter((q) => q.paperId === paperId);
    } else {
      targetQuestions = questions.slice(0, 10);
    }

    const paper = paperId ? papers.find((p) => p.id === paperId) : undefined;
    const body = paper ? EXAMINING_BODIES.find((b) => b.id === paper.examiningBodyId) : undefined;
    const negativeRate = mode === 'exam' && body ? body.negativeMarkingDefault : 0;

    const newAttempt: AttemptSession = {
      id: `attempt-${Date.now()}`,
      paperId,
      mode,
      startTime: Date.now(),
      totalQuestions: targetQuestions.length,
      answers: {},
      currentQuestionIndex: 0,
      negativeMarkingRate: negativeRate,
      isCompleted: false,
    };

    setCurrentAttempt(newAttempt);
    setActiveTab('practice');
  };

  // Record an answer
  const recordQuestionAnswer = (
    questionId: string,
    optionLabel: 'A' | 'B' | 'C' | 'D' | 'E'
  ) => {
    if (!currentAttempt) return;

    logActivity();
    const targetQ = questions.find((q) => q.id === questionId);
    const isCorrect =
      targetQ && targetQ.correctOptionLabel
        ? targetQ.correctOptionLabel === optionLabel
        : undefined;

    const answerRecord: UserAnswerRecord = {
      questionId,
      selectedOptionLabel: optionLabel,
      isCorrect,
      timeSpentSeconds: 15,
      timestamp: Date.now(),
    };

    const updatedAnswers = {
      ...currentAttempt.answers,
      [questionId]: answerRecord,
    };

    setCurrentAttempt({
      ...currentAttempt,
      answers: updatedAnswers,
    });

    // Update mistake records if answered incorrectly
    if (isCorrect === false && targetQ) {
      setMistakes((prev) => {
        const existing = prev[questionId];
        return {
          ...prev,
          [questionId]: {
            questionId,
            paperId: targetQ.paperId,
            lastAttemptedAt: Date.now(),
            selectedOption: optionLabel,
            correctOption: targetQ.correctOptionLabel,
            timesFailed: (existing?.timesFailed || 0) + 1,
            isResolved: false,
          },
        };
      });
    } else if (isCorrect === true && mistakes[questionId]) {
      // Mark mistake resolved if answered correctly
      setMistakes((prev) => {
        const copy = { ...prev };
        if (copy[questionId]) {
          copy[questionId] = { ...copy[questionId], isResolved: true };
        }
        return copy;
      });
    }
  };

  // Finish current attempt
  const finishCurrentAttempt = (): AttemptSession | null => {
    if (!currentAttempt) return null;

    const sessionQuestions = currentAttempt.paperId
      ? questions.filter((q) => q.paperId === currentAttempt.paperId)
      : questions.slice(0, currentAttempt.totalQuestions);

    const scoreResult = calculateExamScore(
      sessionQuestions,
      currentAttempt.answers,
      currentAttempt.negativeMarkingRate
    );

    const completedSession: AttemptSession = {
      ...currentAttempt,
      endTime: Date.now(),
      isCompleted: true,
      score: scoreResult.netScore,
      accuracy: scoreResult.accuracyPercentage,
    };

    setRecentAttempts((prev) => [completedSession, ...prev.slice(0, 49)]);
    setCurrentAttempt(completedSession);
    return completedSession;
  };

  const exitPracticeSession = () => {
    setCurrentAttempt(null);
  };

  // Toggle bookmark
  const toggleBookmark = (questionId: string, notes?: string) => {
    logActivity();
    setBookmarks((prev) => {
      const copy = { ...prev };
      if (copy[questionId]) {
        delete copy[questionId];
      } else {
        copy[questionId] = {
          questionId,
          savedAt: Date.now(),
          notes,
        };
      }
      return copy;
    });
  };

  // Resolve mistake
  const resolveMistake = (questionId: string) => {
    setMistakes((prev) => {
      const copy = { ...prev };
      if (copy[questionId]) {
        copy[questionId] = { ...copy[questionId], isResolved: true };
      }
      return copy;
    });
  };

  // Admin: Add processing job
  const addProcessingJob = (job: ProcessingJob) => {
    setProcessingJobs((prev) => [job, ...prev]);
  };

  const updateProcessingJobStatus = (jobId: string, status: ProcessingJob['status']) => {
    setProcessingJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, status } : job))
    );
  };

  const refreshJobsFromServer = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs) && data.jobs.length > 0) {
          setProcessingJobs(data.jobs);
        }
      }
    } catch (err) {
      console.warn('Could not sync jobs from server:', err);
    }
  };

  const publishJobQuestionsToPaper = (jobId: string) => {
    const job = processingJobs.find((j) => j.id === jobId);
    if (!job || !job.extractedQuestions || job.extractedQuestions.length === 0) return;

    const paperId = `paper-${job.id}`;
    const existingPaper = papers.find((p) => p.id === paperId);
    if (existingPaper) {
      // Already published
      updateProcessingJobStatus(jobId, 'Published');
      return;
    }

    const newPaper: Paper = {
      id: paperId,
      title: `${job.examiningBodyId} - ${job.examName} (${job.year})`,
      paperNumber: job.paperNumber || 'Paper 01',
      examiningBodyId: job.examiningBodyId,
      examinationName: job.examName,
      year: job.year,
      examDate: `${job.year}-05-01`,
      subjectOrCategory: job.jobType === 'video' ? 'Video Lecture Ingestion' : 'Ingested Examination Paper',
      totalQuestions: job.extractedQuestions.length,
      durationMinutes: Math.max(30, job.extractedQuestions.length * 2),
      negativeMarking: job.examiningBodyId === 'PPSC' || job.examiningBodyId === 'SPSC' ? 0.25 : 0,
      verificationStatus: job.status === 'Needs Review' ? 'Needs Review' : 'Verified',
      sourcePdfName: job.fileName,
    };

    addNewPaperWithQuestions(newPaper, job.extractedQuestions);
    updateProcessingJobStatus(jobId, 'Published');
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
    );
  };

  const addNewPaperWithQuestions = (paper: Paper, newQuestions: Question[]) => {
    setPapers((prev) => [paper, ...prev]);
    setQuestions((prev) => [...prev, ...newQuestions]);
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  // Compute overall stats from real attempts
  const allUserAnswers = recentAttempts.flatMap((att) => Object.values(att.answers));
  const uniqueAttempted = calculateUniqueAttemptedCount(allUserAnswers);
  const totalAttempted = allUserAnswers.length;
  const correctCount = allUserAnswers.filter((a) => a.isCorrect === true).length;
  const accuracy =
    totalAttempted > 0 ? +((correctCount / totalAttempted) * 100).toFixed(1) : 0;
  const streakDays = calculateDailyStreak(activityTimestamps);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        userRole,
        setUserRole,
        examiningBodies: EXAMINING_BODIES,
        papers,
        questions,
        processingJobs,
        bookmarks,
        mistakes,
        recentAttempts,
        currentAttempt,
        activityTimestamps,
        startPracticeSession,
        recordQuestionAnswer,
        finishCurrentAttempt,
        exitPracticeSession,
        toggleBookmark,
        resolveMistake,
        addProcessingJob,
        updateProcessingJobStatus,
        publishJobQuestionsToPaper,
        refreshJobsFromServer,
        updateQuestion,
        addNewPaperWithQuestions,
        deleteQuestion,
        selectedYearFilter,
        setSelectedYearFilter,
        selectedBodyFilter,
        setSelectedBodyFilter,
        selectedSubjectFilter,
        setSelectedSubjectFilter,
        stats: {
          totalPapers: papers.length,
          totalQuestions: questions.length,
          attemptedCount: totalAttempted,
          uniqueAttempted,
          correctCount,
          accuracy,
          streakDays,
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
