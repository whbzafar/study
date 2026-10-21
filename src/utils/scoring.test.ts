/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExamScore, calculateUniqueAttemptedCount, calculateDailyStreak } from './scoring';
import { Question } from '../types';

const mockQuestions: Question[] = [
  {
    id: 'q1',
    paperId: 'p1',
    questionNumber: 1,
    questionText: 'The ancient Harappa archaeological site is located in which district of Pakistan?',
    language: 'English',
    options: [
      { id: 'o1', label: 'A', text: 'Larkana' },
      { id: 'o2', label: 'B', text: 'Sahiwal' },
      { id: 'o3', label: 'C', text: 'Taxila' },
      { id: 'o4', label: 'D', text: 'Bahawalpur' },
    ],
    correctOptionLabel: 'B',
    verificationStatus: 'Verified',
    subject: 'Pakistan Affairs',
  },
  {
    id: 'q2',
    paperId: 'p1',
    questionNumber: 2,
    questionText: 'Which mountain pass connects Peshawar with Afghanistan?',
    language: 'English',
    options: [
      { id: 'o5', label: 'A', text: 'Bolan Pass' },
      { id: 'o6', label: 'B', text: 'Khyber Pass' },
      { id: 'o7', label: 'C', text: 'Khunjerab Pass' },
      { id: 'o8', label: 'D', text: 'Gomal Pass' },
    ],
    correctOptionLabel: 'B',
    verificationStatus: 'Verified',
    subject: 'Pakistan Affairs',
  },
  {
    id: 'q3',
    paperId: 'p1',
    questionNumber: 3,
    questionText: 'What is the SI unit of electric potential difference?',
    language: 'English',
    options: [
      { id: 'o9', label: 'A', text: 'Ampere' },
      { id: 'o10', label: 'B', text: 'Ohm' },
      { id: 'o11', label: 'C', text: 'Volt' },
      { id: 'o12', label: 'D', text: 'Joule' },
    ],
    correctOptionLabel: 'C',
    verificationStatus: 'Verified',
    subject: 'Everyday Science',
  },
  {
    id: 'q4',
    paperId: 'p1',
    questionNumber: 4,
    questionText: 'Incomplete question with unverified answer key in past paper?',
    language: 'English',
    options: [
      { id: 'o13', label: 'A', text: 'Option A' },
      { id: 'o14', label: 'B', text: 'Option B' },
    ],
    verificationStatus: 'Unverified',
    subject: 'General Knowledge',
  },
];

test('calculateExamScore computes correct, incorrect, unanswered and accuracy with no negative marking', () => {
  const answers = {
    q1: { questionId: 'q1', selectedOptionLabel: 'B' as const, timestamp: 1000 }, // correct
    q2: { questionId: 'q2', selectedOptionLabel: 'A' as const, timestamp: 1001 }, // incorrect
    // q3 unanswered
    q4: { questionId: 'q4', selectedOptionLabel: 'A' as const, timestamp: 1002 }, // unverified
  };

  const score = calculateExamScore(mockQuestions, answers, 0);

  assert.equal(score.totalQuestions, 4);
  assert.equal(score.attempted, 3);
  assert.equal(score.unanswered, 1);
  assert.equal(score.correct, 1);
  assert.equal(score.incorrect, 1);
  assert.equal(score.unscoredOrUnverified, 1);
  assert.equal(score.penaltyPoints, 0);
  assert.equal(score.netScore, 1);
  assert.equal(score.accuracyPercentage, 50.0);
});

test('calculateExamScore applies PPSC negative marking penalty of 0.25 per wrong answer', () => {
  const answers = {
    q1: { questionId: 'q1', selectedOptionLabel: 'B' as const, timestamp: 1000 }, // correct (+1)
    q2: { questionId: 'q2', selectedOptionLabel: 'A' as const, timestamp: 1001 }, // incorrect (-0.25)
    q3: { questionId: 'q3', selectedOptionLabel: 'A' as const, timestamp: 1002 }, // incorrect (-0.25)
  };

  const score = calculateExamScore(mockQuestions, answers, 0.25);

  assert.equal(score.correct, 1);
  assert.equal(score.incorrect, 2);
  assert.equal(score.penaltyPoints, 0.5);
  assert.equal(score.netScore, 0.5); // 1.0 - 0.5 = 0.5
});

test('calculateUniqueAttemptedCount ignores repeat submissions on same question', () => {
  const answerRecords = [
    { questionId: 'q1', selectedOptionLabel: 'A' as const, timestamp: 1000 },
    { questionId: 'q1', selectedOptionLabel: 'B' as const, timestamp: 2000 }, // repeat attempt
    { questionId: 'q2', selectedOptionLabel: 'B' as const, timestamp: 3000 },
  ];

  const count = calculateUniqueAttemptedCount(answerRecords);
  assert.equal(count, 2);
});

test('calculateDailyStreak handles multi-day streaks correctly', () => {
  const now = new Date('2026-10-21T12:00:00Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Active today, yesterday, and day before yesterday
  const timestamps = [
    now,
    now - dayMs,
    now - 2 * dayMs,
  ];

  assert.equal(calculateDailyStreak(timestamps, now), 3);
});
