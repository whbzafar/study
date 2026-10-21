/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExaminingBodyId = 'PPSC' | 'FPSC' | 'SPSC' | 'KPPSC' | 'BPSC' | 'NTS' | 'OTS';

export interface ExaminingBody {
  id: ExaminingBodyId;
  name: string;
  fullName: string;
  province: string;
  negativeMarkingDefault: number; // e.g. 0.25 for PPSC, 0 for FPSC
  totalPapersCount: number;
  description: string;
}

export type SubjectCategory =
  | 'Pakistan Affairs'
  | 'Islamic Studies'
  | 'General Knowledge'
  | 'Everyday Science'
  | 'Current Affairs'
  | 'English'
  | 'Urdu'
  | 'Mathematics & Reasoning'
  | 'Computer Science';

export type VerificationStatus = 'Verified' | 'Needs Review' | 'Unverified' | 'Disputed';

export interface AnswerOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface Question {
  id: string;
  paperId: string;
  questionNumber: number;
  questionText: string;
  originalQuestionText?: string;
  language: 'English' | 'Urdu' | 'Bilingual';
  options: AnswerOption[];
  correctOptionLabel?: 'A' | 'B' | 'C' | 'D' | 'E'; // undefined if unverified/missing
  extractedAnswerKey?: 'A' | 'B' | 'C' | 'D' | 'E'; // original key detected on paper
  verifiedAnswerKey?: 'A' | 'B' | 'C' | 'D' | 'E'; // human or official confirmed key
  verificationStatus: VerificationStatus;
  explanation?: string;
  isAiExplanation?: boolean;
  subject: SubjectCategory;
  sourcePage?: number;
  extractionConfidence?: number; // 0.0 to 1.0
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  hasMissingOptions?: boolean;
  isUserOverridden?: boolean;
}

export interface Paper {
  id: string;
  title: string;
  paperNumber: string; // e.g. "Paper 01"
  examiningBodyId: ExaminingBodyId;
  examinationName: string; // e.g. "Tehsildar / Naib Tehsildar"
  year: number; // 2026, 2025, 2024, etc.
  examDate?: string;
  subjectOrCategory: string;
  totalQuestions: number;
  durationMinutes: number;
  negativeMarking: number;
  verificationStatus: 'Verified' | 'Partially Verified' | 'Needs Review';
  sourcePdfName?: string;
  questions?: Question[];
}

export type PracticeMode =
  | 'learning' // Immediate feedback & explanation
  | 'exam' // Timed, no instant feedback, review at end with negative marking
  | 'revision' // Focus on wrong / bookmarked questions
  | 'random' // Custom random pool
  | 'full_paper'; // Strict 1 to N sequence

export interface UserAnswerRecord {
  questionId: string;
  selectedOptionLabel?: 'A' | 'B' | 'C' | 'D' | 'E';
  isCorrect?: boolean;
  timeSpentSeconds?: number;
  timestamp: number;
}

export interface AttemptSession {
  id: string;
  paperId?: string;
  mode: PracticeMode;
  startTime: number;
  endTime?: number;
  totalQuestions: number;
  answers: Record<string, UserAnswerRecord>;
  currentQuestionIndex: number;
  negativeMarkingRate: number;
  isCompleted: boolean;
  score?: number;
  accuracy?: number;
}

export interface BookmarkItem {
  questionId: string;
  savedAt: number;
  notes?: string;
  tags?: string[];
}

export interface MistakeRecord {
  questionId: string;
  paperId: string;
  lastAttemptedAt: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | 'E';
  correctOption?: 'A' | 'B' | 'C' | 'D' | 'E';
  timesFailed: number;
  isResolved: boolean;
}

export interface UserStats {
  totalAttempted: number;
  uniqueAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  studyStreakDays: number;
  subjectProficiency: Record<SubjectCategory, { attempted: number; correct: number }>;
}

export interface ProcessingJob {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  documentType?: 'digital' | 'scanned';
  examiningBodyId: ExaminingBodyId;
  examName: string;
  year: number;
  paperNumber: string;
  language: 'English' | 'Urdu' | 'Bilingual';
  status: 'Uploaded' | 'Queued' | 'Processing' | 'Needs Review' | 'Verified' | 'Published' | 'Failed';
  totalPages: number;
  extractedQuestionsCount: number;
  confidenceScore: number;
  uploadedAt: number;
  reviewedBy?: string;
  extractedQuestions?: Question[];
  rawExtractedText?: string;
  previewSnippet?: string;
  verificationSummary?: {
    verifiedCount: number;
    unverifiedCount: number;
    missingOptionsCount: number;
  };
  errorMessage?: string;
}
