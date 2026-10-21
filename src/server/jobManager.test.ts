/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobManager } from './jobManager';

test('jobManager creates PDF and Video jobs with correct metadata', async () => {
  const pdfJob = await jobManager.createJob({
    fileName: 'PPSC_Revenue_2026.pdf',
    fileSizeBytes: 5200000,
    jobType: 'pdf',
    examiningBodyId: 'PPSC',
    examName: 'Naib Tehsildar',
    year: 2026,
    paperNumber: 'Paper 01',
    language: 'Bilingual',
  });

  assert.ok(pdfJob.id.startsWith('job-'));
  assert.equal(pdfJob.jobType, 'pdf');
  assert.equal(pdfJob.status, 'Queued');
  assert.equal(pdfJob.examiningBodyId, 'PPSC');

  const videoJob = await jobManager.createJob({
    fileName: 'CSS_Pakistan_Affairs_Lecture_01.mp4',
    fileSizeBytes: 45000000,
    jobType: 'video',
    examiningBodyId: 'FPSC',
    examName: 'CSS Competitive Examination',
    year: 2025,
    paperNumber: 'Paper 01',
  });

  assert.equal(videoJob.jobType, 'video');
  assert.equal(videoJob.status, 'Queued');
});

test('jobManager handles idempotent retries and state resets', async () => {
  const job = await jobManager.createJob({
    fileName: 'KPPSC_Tehsil_Officer.pdf',
    fileSizeBytes: 3100000,
    examiningBodyId: 'KPPSC',
    examName: 'Tehsil Municipal Officer',
    year: 2025,
    paperNumber: 'Paper 01',
  });

  // Simulate a failed run
  await jobManager.updateJob(job.id, {
    status: 'Failed',
    errorMessage: 'Corrupt scanned page image header',
    progressPercent: 30,
  });

  const failedJob = jobManager.getJob(job.id);
  assert.equal(failedJob?.status, 'Failed');
  assert.equal(failedJob?.errorMessage, 'Corrupt scanned page image header');

  // Retry job
  const retriedJob = await jobManager.retryJob(job.id);
  assert.equal(retriedJob?.status, 'Queued');
  assert.equal(retriedJob?.progressPercent, 0);
  assert.equal(retriedJob?.errorMessage, undefined);
  assert.equal(retriedJob?.retryCount, 1);
});

test('jobManager cancels active jobs cleanly', async () => {
  const job = await jobManager.createJob({
    fileName: 'SPSC_CCE_General_Science.pdf',
    fileSizeBytes: 4200000,
    examiningBodyId: 'SPSC',
    examName: 'Combined Competitive Examination',
    year: 2026,
    paperNumber: 'Paper 01',
  });

  const cancelled = await jobManager.cancelJob(job.id);
  assert.equal(cancelled, true);

  const updatedJob = jobManager.getJob(job.id);
  assert.equal(updatedJob?.status, 'Cancelled');
  assert.match(updatedJob?.currentStage || '', /cancelled by user/);
});
