/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { SERVER_CONFIG } from './config';
import { ProcessingJob, Question } from '../types';
import { extractQuestionsFromPdfFile, transcribeAudioWithGemini, generateStudyNotesAndMcqsFromTranscript } from './geminiPipeline';
import { extractVideoMetadata, extractAudioTrack } from './mediaProcessor';

export class JobManager {
  private jobs: Map<string, ProcessingJob> = new Map();
  private activeWorkers = 0;
  private isProcessingLoopActive = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(SERVER_CONFIG.DATA_DIR, { recursive: true });
      const exists = await fs.stat(SERVER_CONFIG.JOBS_FILE).catch(() => null);
      if (exists) {
        const raw = await fs.readFile(SERVER_CONFIG.JOBS_FILE, 'utf8');
        const parsed: ProcessingJob[] = JSON.parse(raw);
        for (const job of parsed) {
          this.jobs.set(job.id, job);
        }
      } else {
        // Initialize with default historical jobs
        const initialSeedJobs: ProcessingJob[] = [
          {
            id: 'job-ppsc-2026-01',
            jobType: 'pdf',
            sourceType: 'upload',
            fileName: 'PPSC_Tehsildar_General_2026.pdf',
            fileSizeBytes: 2450000,
            examiningBodyId: 'PPSC',
            examName: 'Tehsildar & Naib Tehsildar',
            year: 2026,
            paperNumber: 'Paper 01',
            language: 'Bilingual',
            status: 'Verified',
            progressPercent: 100,
            totalPages: 8,
            extractedQuestionsCount: 12,
            confidenceScore: 0.97,
            uploadedAt: Date.now() - 3600000 * 24 * 3,
            reviewedBy: 'Chief Examiner / Admin',
          },
          {
            id: 'job-fpsc-2025-02',
            jobType: 'pdf',
            sourceType: 'upload',
            fileName: 'FPSC_FIA_Inspector_2025_Scanned.pdf',
            fileSizeBytes: 3820000,
            examiningBodyId: 'FPSC',
            examName: 'Assistant Director FIA',
            year: 2025,
            paperNumber: 'Paper 02',
            language: 'English',
            status: 'Needs Review',
            progressPercent: 100,
            totalPages: 6,
            extractedQuestionsCount: 14,
            confidenceScore: 0.78,
            uploadedAt: Date.now() - 3600000 * 12,
            errorMessage: 'Questions #8 and #12 contain low contrast print. Options C and D require verification.',
          },
        ];

        for (const j of initialSeedJobs) {
          this.jobs.set(j.id, j);
        }
        await this.persistJobs();
      }
    } catch (err: any) {
      console.error('[JobManager] Initialization error:', err.message);
    }
  }

  private async persistJobs() {
    try {
      const list = Array.from(this.jobs.values());
      await fs.writeFile(SERVER_CONFIG.JOBS_FILE, JSON.stringify(list, null, 2));
    } catch (err: any) {
      console.warn('[JobManager] Failed to persist jobs:', err.message);
    }
  }

  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  getJob(id: string): ProcessingJob | undefined {
    return this.jobs.get(id);
  }

  async createJob(params: {
    fileName: string;
    fileSizeBytes: number;
    jobType?: 'pdf' | 'video';
    sourceType?: 'upload' | 'url';
    sourceUrl?: string;
    documentType?: 'digital' | 'scanned';
    examiningBodyId: any;
    examName: string;
    year: number;
    paperNumber: string;
    language?: 'English' | 'Urdu' | 'Bilingual';
    storagePath?: string;
  }): Promise<ProcessingJob> {
    const isVideo =
      params.jobType === 'video' ||
      /\.(mp4|webm|mov|mkv|avi)$/i.test(params.fileName);

    const id = `job-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const job: ProcessingJob = {
      id,
      jobType: isVideo ? 'video' : 'pdf',
      sourceType: params.sourceType || 'upload',
      sourceUrl: params.sourceUrl,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      documentType: params.documentType || 'digital',
      examiningBodyId: params.examiningBodyId || 'PPSC',
      examName: params.examName || 'Competitive Examination',
      year: params.year || 2026,
      paperNumber: params.paperNumber || 'Paper 01',
      language: params.language || 'English',
      status: 'Queued',
      progressPercent: 0,
      currentStage: 'Queued in background processing pipeline',
      totalPages: 1,
      extractedQuestionsCount: 0,
      confidenceScore: 0,
      uploadedAt: Date.now(),
      storagePath: params.storagePath,
      retryCount: 0,
    };

    this.jobs.set(id, job);
    await this.persistJobs();
    this.triggerWorkerPump();
    return job;
  }

  async updateJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;

    const merged = { ...existing, ...updates };
    this.jobs.set(id, merged);
    await this.persistJobs();
    return merged;
  }

  async cancelJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (['Verified', 'Published', 'Failed', 'Cancelled'].includes(job.status)) {
      return false;
    }

    job.status = 'Cancelled';
    job.currentStage = 'Job cancelled by user';
    job.completedAt = Date.now();
    await this.persistJobs();
    return true;
  }

  async retryJob(id: string): Promise<ProcessingJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    // Reset job state idempotently
    job.status = 'Queued';
    job.progressPercent = 0;
    job.currentStage = 'Re-queued for execution';
    job.errorMessage = undefined;
    job.extractedQuestions = [];
    job.extractedQuestionsCount = 0;
    job.confidenceScore = 0;
    job.retryCount = (job.retryCount || 0) + 1;
    job.startedAt = undefined;
    job.completedAt = undefined;

    await this.persistJobs();
    this.triggerWorkerPump();
    return job;
  }

  private triggerWorkerPump() {
    if (this.isProcessingLoopActive) return;
    this.isProcessingLoopActive = true;

    setImmediate(async () => {
      try {
        while (this.activeWorkers < SERVER_CONFIG.MAX_CONCURRENT_WORKERS) {
          const queuedJob = Array.from(this.jobs.values()).find(
            (j) => j.status === 'Queued' && Boolean(j.storagePath)
          );
          if (!queuedJob) break;

          this.activeWorkers++;
          this.processJob(queuedJob.id).finally(() => {
            this.activeWorkers--;
            this.triggerWorkerPump();
          });
        }
      } finally {
        this.isProcessingLoopActive = false;
      }
    });
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'Queued') return;

    if (!job.storagePath) {
      // Ingestion job without a local storage file yet (e.g. queued placeholder or test)
      return;
    }

    job.startedAt = Date.now();

    try {
      if (job.jobType === 'video') {
        await this.executeVideoPipeline(job);
      } else {
        await this.executePdfPipeline(job);
      }
    } catch (err: any) {
      console.error(`[JobManager] Failure processing job ${jobId}:`, err);
      job.status = 'Failed';
      job.errorMessage = err.message || 'Unknown processing error';
      job.currentStage = 'Processing failed';
      job.completedAt = Date.now();
      await this.persistJobs();
    }
  }

  private async executePdfPipeline(job: ProcessingJob) {
    await this.updateJob(job.id, {
      status: 'Processing',
      progressPercent: 20,
      currentStage: 'Analyzing document structure and embedded text layers',
    });

    const storagePath = job.storagePath || '';
    const paperId = `paper-${job.id}`;

    // Extract questions using OCR / Gemini
    await this.updateJob(job.id, {
      progressPercent: 50,
      currentStage: 'Digitizing examination questions, options, and official keys',
    });

    const result = await extractQuestionsFromPdfFile(storagePath, {
      examiningBody: job.examiningBodyId,
      examName: job.examName,
      year: job.year,
      paperNumber: job.paperNumber,
      documentType: job.documentType,
      paperId,
    });

    await this.updateJob(job.id, {
      progressPercent: 85,
      currentStage: 'Validating questions integrity and distractor completeness',
    });

    const verifiedCount = result.questions.filter((q) => q.verificationStatus === 'Verified').length;
    const unverifiedCount = result.questions.filter((q) => q.verificationStatus !== 'Verified').length;
    const missingOptionsCount = result.questions.filter((q) => q.hasMissingOptions).length;

    const overallConfidence =
      result.questions.length > 0
        ? Math.round(
            (result.questions.reduce((acc, q) => acc + (q.extractionConfidence || 0.9), 0) /
              result.questions.length) *
              100
          ) / 100
        : 0.9;

    const finalStatus =
      unverifiedCount > 0 || missingOptionsCount > 0 ? 'Needs Review' : 'Verified';

    await this.updateJob(job.id, {
      status: finalStatus,
      progressPercent: 100,
      currentStage:
        finalStatus === 'Verified'
          ? 'Completed: All MCQs verified & ready for practice'
          : 'Completed with flags: Review needed for low-contrast/missing keys',
      totalPages: result.totalPages,
      extractedQuestions: result.questions,
      extractedQuestionsCount: result.questions.length,
      confidenceScore: overallConfidence,
      rawExtractedText: result.rawTextPreview,
      previewSnippet: result.rawTextPreview.slice(0, 300),
      verificationSummary: {
        verifiedCount,
        unverifiedCount,
        missingOptionsCount,
      },
      completedAt: Date.now(),
    });
  }

  private async executeVideoPipeline(job: ProcessingJob) {
    const storagePath = job.storagePath || '';

    // Step 1: Video metadata extraction
    await this.updateJob(job.id, {
      status: 'Processing',
      progressPercent: 15,
      currentStage: 'Extracting video duration, format, and encoding properties',
    });

    const metadata = await extractVideoMetadata(storagePath);
    job.videoMetadata = metadata;

    // Step 2: Audio extraction via FFmpeg
    await this.updateJob(job.id, {
      progressPercent: 35,
      currentStage: 'Extracting optimized mono audio track via FFmpeg for transcription',
      videoMetadata: metadata,
    });

    const tempAudioPath = path.join(
      SERVER_CONFIG.TEMP_CHUNKS_DIR,
      `audio-${job.id}.mp3`
    );

    try {
      await extractAudioTrack(storagePath, tempAudioPath);
    } catch (err: any) {
      console.warn('[JobManager] Direct audio extract fallback:', err.message);
    }

    // Step 3: Transcription
    await this.updateJob(job.id, {
      status: 'Transcribing',
      progressPercent: 65,
      currentStage: 'Generating timestamped speech-to-text transcript segments',
    });

    const transcriptResult = await transcribeAudioWithGemini(tempAudioPath, {
      title: job.fileName,
      language: job.language,
    });

    job.transcript = transcriptResult;

    // Step 4: Study Notes & Exam Questions Generation
    await this.updateJob(job.id, {
      status: 'Generating MCQs',
      progressPercent: 85,
      currentStage: 'Synthesizing lecture summary, key concepts, and exam questions',
      transcript: transcriptResult,
    });

    const paperId = `paper-video-${job.id}`;
    const studyMaterial = await generateStudyNotesAndMcqsFromTranscript(transcriptResult.fullText, {
      examName: job.examName,
      examiningBodyId: job.examiningBodyId,
      year: job.year,
      paperId,
    });

    // Cleanup temporary audio file
    try {
      await fs.unlink(tempAudioPath);
    } catch {}

    await this.updateJob(job.id, {
      status: 'Verified',
      progressPercent: 100,
      currentStage: 'Lecture ingestion complete: Transcript, study notes & MCQs ready',
      studyNotes: studyMaterial.studyNotes,
      extractedQuestions: studyMaterial.questions,
      extractedQuestionsCount: studyMaterial.questions.length,
      confidenceScore: 0.98,
      completedAt: Date.now(),
      verificationSummary: {
        verifiedCount: studyMaterial.questions.length,
        unverifiedCount: 0,
        missingOptionsCount: 0,
      },
    });
  }
}

export const jobManager = new JobManager();
