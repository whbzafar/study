/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, UserAnswerRecord } from '../types';

export interface ScoreBreakdown {
  totalQuestions: number;
  attempted: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  unscoredOrUnverified: number;
  rawScore: number;
  penaltyPoints: number;
  netScore: number;
  maxPossibleScore: number;
  accuracyPercentage: number;
}

/**
 * Calculates deterministic score breakdown for an exam or practice session.
 * Correctly adheres to competitive exam rules (e.g. PPSC negative marking).
 * Properly handles unverified answer keys: does not penalize or score if key is missing/unverified.
 */
export function calculateExamScore(
  questions: Question[],
  answers: Record<string, UserAnswerRecord>,
  negativeMarkingRate: number = 0
): ScoreBreakdown {
  let attempted = 0;
  let correct = 0;
  let incorrect = 0;
  let unscoredOrUnverified = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer || !answer.selectedOptionLabel) {
      continue;
    }

    attempted++;

    // Check if answer key is verified and present
    if (!question.correctOptionLabel || question.verificationStatus === 'Unverified') {
      unscoredOrUnverified++;
      continue;
    }

    if (answer.selectedOptionLabel === question.correctOptionLabel) {
      correct++;
    } else {
      incorrect++;
    }
  }

  const unanswered = questions.length - attempted;
  const rawScore = correct * 1.0;
  const penaltyPoints = incorrect * Math.max(0, negativeMarkingRate);
  const netScore = Math.max(0, +(rawScore - penaltyPoints).toFixed(2));
  const scorableAttempts = correct + incorrect;
  const accuracyPercentage =
    scorableAttempts > 0 ? +((correct / scorableAttempts) * 100).toFixed(1) : 0;

  return {
    totalQuestions: questions.length,
    attempted,
    unanswered,
    correct,
    incorrect,
    unscoredOrUnverified,
    rawScore,
    penaltyPoints: +penaltyPoints.toFixed(2),
    netScore,
    maxPossibleScore: questions.length,
    accuracyPercentage,
  };
}

/**
 * Calculates unique questions attempted across any number of practice sessions.
 */
export function calculateUniqueAttemptedCount(
  allAttemptRecords: UserAnswerRecord[]
): number {
  const uniqueQuestionIds = new Set<string>();
  for (const record of allAttemptRecords) {
    if (record.selectedOptionLabel) {
      uniqueQuestionIds.add(record.questionId);
    }
  }
  return uniqueQuestionIds.size;
}

/**
 * Calculates current study streak based on recorded activity timestamps.
 */
export function calculateDailyStreak(timestamps: number[], referenceTime = Date.now()): number {
  if (!timestamps || timestamps.length === 0) return 0;

  const dayFormat = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const activeDays = new Set<string>(timestamps.map(dayFormat));
  const oneDayMs = 24 * 60 * 60 * 1000;

  let currentCheck = new Date(referenceTime);
  const todayStr = dayFormat(currentCheck.getTime());

  // Check if today is active, or if yesterday was active to continue streak
  let checkMs = currentCheck.getTime();
  if (!activeDays.has(todayStr)) {
    // If not today, check yesterday
    checkMs -= oneDayMs;
    if (!activeDays.has(dayFormat(checkMs))) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDays.has(dayFormat(checkMs))) {
    streak++;
    checkMs -= oneDayMs;
  }

  return streak;
}
