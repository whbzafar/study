/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemLimitsResponse, ProcessingJob, DocumentOutline, Question } from '../types';

export interface UploadProgressEvent {
  uploadId: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedBytes: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
  speedBytesPerSec: number;
  status: 'initializing' | 'uploading' | 'assembling' | 'completed' | 'failed' | 'paused';
  errorMessage?: string;
}

export interface ChunkUploadOptions {
  examMetadata?: any;
  onProgress?: (progress: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

// Fetch deployment-controlled limits dynamically from server
export async function fetchSystemLimits(): Promise<SystemLimitsResponse> {
  const res = await fetch('/api/system/limits');
  if (!res.ok) {
    throw new Error('Failed to retrieve server ingestion limits');
  }
  return res.json();
}

// Convert ArrayBuffer chunk to Base64 efficiently
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Upload large file using memory-efficient chunking (file.slice) and safe resumption
export async function uploadFileInChunks(
  file: File,
  options: ChunkUploadOptions = {}
): Promise<{ job: ProcessingJob; fileInfo: any }> {
  const { examMetadata, onProgress, signal } = options;

  // Step 1: Query server for active deployment limit and chunk size
  let limits: SystemLimitsResponse;
  try {
    limits = await fetchSystemLimits();
  } catch {
    limits = {
      maxUploadSizeBytes: 2 * 1024 * 1024 * 1024,
      maxUploadSizeFormatted: '2.0 GB',
      chunkSizeBytes: 5 * 1024 * 1024,
      chunkSizeFormatted: '5.0 MB',
      maxUrlDownloadSizeBytes: 500 * 1024 * 1024,
      maxUrlDownloadFormatted: '500.0 MB',
      supportedPdfTypes: ['application/pdf'],
      supportedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      ffmpegAvailable: true,
      workerConcurrency: 2,
      storageUsage: { totalFiles: 0, totalSizeBytes: 0 },
    };
  }

  // Validate against real server-side infrastructure limit
  if (file.size > limits.maxUploadSizeBytes) {
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the active server storage tier of ${limits.maxUploadSizeFormatted}. Please split large past paper compilations or compress video resolution.`
    );
  }

  // Step 2: Initialize upload session
  const initRes = await fetch('/api/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      examMetadata: examMetadata || {},
    }),
    signal,
  });

  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    throw new Error(errData.error || `Upload initialization failed (${initRes.status})`);
  }

  const session = await initRes.json();
  const { uploadId, totalChunks } = session;
  const chunkSize = session.chunkSizeBytes || limits.chunkSizeBytes;

  // Step 3: Check existing chunks on server (for automatic resumption after connection loss)
  let receivedChunks = new Set<number>();
  try {
    const statusRes = await fetch(`/api/upload/status/${uploadId}`, { signal });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      receivedChunks = new Set(statusData.receivedChunks || []);
    }
  } catch {}

  let totalUploadedBytes = Array.from(receivedChunks).length * chunkSize;
  let startTime = Date.now();

  onProgress?.({
    uploadId,
    fileName: file.name,
    fileSizeBytes: file.size,
    uploadedBytes: totalUploadedBytes,
    percent: Math.round((totalUploadedBytes / file.size) * 100),
    currentChunk: receivedChunks.size,
    totalChunks,
    speedBytesPerSec: 0,
    status: 'uploading',
  });

  // Step 4: Stream upload chunks using file.slice (loads only 5MB into memory at a time!)
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      throw new Error('Upload cancelled by user.');
    }

    // Skip already confirmed chunks (resumption)
    if (receivedChunks.has(chunkIndex)) {
      continue;
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunkBlob = file.slice(start, end);

    // Read only this specific chunk
    const chunkBuffer = await chunkBlob.arrayBuffer();

    let success = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        const chunkStartTime = Date.now();

        // Send as octet-stream
        const chunkRes = await fetch(`/api/upload/chunk`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-upload-id': uploadId,
            'x-chunk-index': chunkIndex.toString(),
          },
          body: chunkBuffer,
          signal,
        });

        if (chunkRes.ok) {
          success = true;
          receivedChunks.add(chunkIndex);
          totalUploadedBytes += chunkBlob.size;

          const elapsedSec = (Date.now() - chunkStartTime) / 1000;
          const speed = elapsedSec > 0 ? chunkBlob.size / elapsedSec : 0;

          onProgress?.({
            uploadId,
            fileName: file.name,
            fileSizeBytes: file.size,
            uploadedBytes: Math.min(file.size, totalUploadedBytes),
            percent: Math.min(99, Math.round((totalUploadedBytes / file.size) * 100)),
            currentChunk: chunkIndex + 1,
            totalChunks,
            speedBytesPerSec: speed,
            status: 'uploading',
          });
        } else {
          // Fallback to json chunk if proxy blocked octet-stream
          const base64 = arrayBufferToBase64(chunkBuffer);
          const fallbackRes = await fetch('/api/upload/chunk-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId,
              chunkIndex,
              chunkBase64: base64,
            }),
            signal,
          });

          if (fallbackRes.ok) {
            success = true;
            receivedChunks.add(chunkIndex);
            totalUploadedBytes += chunkBlob.size;
          } else {
            throw new Error(`Server returned HTTP ${chunkRes.status}`);
          }
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        if (attempts >= maxAttempts) {
          throw new Error(
            `Failed uploading chunk ${chunkIndex + 1}/${totalChunks} after ${maxAttempts} attempts: ${err.message}`
          );
        }
        // Wait backoff before retrying chunk
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  // Step 5: Finalize & reassemble on server
  onProgress?.({
    uploadId,
    fileName: file.name,
    fileSizeBytes: file.size,
    uploadedBytes: file.size,
    percent: 100,
    currentChunk: totalChunks,
    totalChunks,
    speedBytesPerSec: 0,
    status: 'assembling',
  });

  const completeRes = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId }),
    signal,
  });

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error(err.error || 'Server failed to reassemble uploaded file');
  }

  const result = await completeRes.json();

  onProgress?.({
    uploadId,
    fileName: file.name,
    fileSizeBytes: file.size,
    uploadedBytes: file.size,
    percent: 100,
    currentChunk: totalChunks,
    totalChunks,
    speedBytesPerSec: 0,
    status: 'completed',
  });

  return result;
}

// Import public PDF/Media URL with server-side SSRF validation
export async function importFromPublicUrl(
  url: string,
  examMetadata?: any
): Promise<{ job: ProcessingJob; downloadResult: any }> {
  const res = await fetch('/api/ingestion/import-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      examMetadata: examMetadata || {},
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || `Failed to import URL (HTTP ${res.status})`);
  }

  return res.json();
}

// Query all background ingestion jobs
export async function fetchIngestionJobs(): Promise<ProcessingJob[]> {
  const res = await fetch('/api/jobs');
  if (!res.ok) throw new Error('Failed to fetch processing jobs');
  const data = await res.json();
  return data.jobs || [];
}

// Query single job
export async function fetchJobDetails(jobId: string): Promise<ProcessingJob> {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  const data = await res.json();
  return data.job;
}

// Retry failed job
export async function retryJob(jobId: string): Promise<ProcessingJob> {
  const res = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry job');
  const data = await res.json();
  return data.job;
}

// Cancel job
export async function cancelJob(jobId: string): Promise<boolean> {
  const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to cancel job');
  const data = await res.json();
  return data.success;
}

// Rapidly generate a structural chapter & topic outline for a document
export async function fetchDocumentOutline(params: {
  fileName?: string;
  sampleText?: string;
  pdfBase64?: string;
  examMetadata?: any;
}): Promise<DocumentOutline> {
  const res = await fetch('/api/gemini/generate-outline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || `Failed to generate outline (HTTP ${res.status})`);
  }

  return res.json();
}

// Generate targeted chapter MCQs for a selected outline chapter
export async function generateChapterQuestions(params: {
  chapterTitle: string;
  keyTopics: string[];
  subject: string;
  count?: number;
  difficulty?: string;
  examMetadata?: any;
  paperId?: string;
}): Promise<Question[]> {
  const res = await fetch('/api/gemini/generate-chapter-mcqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || `Failed to generate chapter MCQs (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.questions || [];
}
