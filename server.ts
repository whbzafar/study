/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs/promises';

import { SERVER_CONFIG, formatBytes } from './src/server/config';
import { storageManager } from './src/server/storageManager';
import { jobManager } from './src/server/jobManager';
import { validateUrlForSsrf, safeDownloadUrl } from './src/server/ssrfValidator';
import { isFfmpegAvailable } from './src/server/mediaProcessor';
import { generateDocumentOutline, generateChapterMcqs } from './src/server/geminiPipeline';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Raw body parser for binary chunk streams
app.use('/api/upload/chunk', express.raw({ type: 'application/octet-stream', limit: '32mb' }));

// JSON and URL-encoded parsers (using scalable limits, not fixed 50MB restriction)
const jsonLimit = `${Math.ceil(SERVER_CONFIG.UPLOAD_CHUNK_SIZE_BYTES / (1024 * 1024)) * 3}mb`;
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ---------------------------------------------------------------------------
// 1. Health & System Limits Endpoints
// ---------------------------------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ExamPilot Pakistan Backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system/limits', async (_req: Request, res: Response) => {
  try {
    const storageUsage = await storageManager.getStorageStats();
    const ffmpegAvailable = await isFfmpegAvailable();

    res.json({
      maxUploadSizeBytes: SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES,
      maxUploadSizeFormatted: formatBytes(SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES),
      chunkSizeBytes: SERVER_CONFIG.UPLOAD_CHUNK_SIZE_BYTES,
      chunkSizeFormatted: formatBytes(SERVER_CONFIG.UPLOAD_CHUNK_SIZE_BYTES),
      maxUrlDownloadSizeBytes: SERVER_CONFIG.MAX_URL_DOWNLOAD_SIZE_BYTES,
      maxUrlDownloadFormatted: formatBytes(SERVER_CONFIG.MAX_URL_DOWNLOAD_SIZE_BYTES),
      supportedPdfTypes: SERVER_CONFIG.SUPPORTED_PDF_MIME_TYPES,
      supportedVideoTypes: SERVER_CONFIG.SUPPORTED_VIDEO_MIME_TYPES,
      ffmpegAvailable,
      workerConcurrency: SERVER_CONFIG.MAX_CONCURRENT_WORKERS,
      storageUsage,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve system limits', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Chunked Resumable Upload Endpoints
// ---------------------------------------------------------------------------

// Step A: Initialize upload session
app.post('/api/upload/init', async (req: Request, res: Response) => {
  try {
    const { fileName, fileSizeBytes, mimeType, examMetadata } = req.body;

    if (!fileName || !fileSizeBytes) {
      return res.status(400).json({ error: 'fileName and fileSizeBytes are required' });
    }

    const session = await storageManager.initSession({
      fileName,
      fileSizeBytes: parseInt(fileSizeBytes, 10),
      mimeType: mimeType || 'application/octet-stream',
      examMetadata,
    });

    res.json({
      uploadId: session.uploadId,
      fileName: session.fileName,
      fileSizeBytes: session.fileSizeBytes,
      chunkSizeBytes: session.chunkSizeBytes,
      totalChunks: session.totalChunks,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    console.error('Error in /api/upload/init:', error);
    res.status(400).json({ error: error.message });
  }
});

// Step B: Upload chunk (supports binary stream via octet-stream OR base64 payload)
app.put('/api/upload/chunk', async (req: Request, res: Response) => {
  try {
    const uploadId = (req.headers['x-upload-id'] as string) || (req.query.uploadId as string);
    const chunkIndexStr = (req.headers['x-chunk-index'] as string) || (req.query.chunkIndex as string);

    if (!uploadId || chunkIndexStr === undefined) {
      return res.status(400).json({ error: 'Missing x-upload-id or x-chunk-index header/query' });
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    let chunkBuffer: Buffer;

    if (Buffer.isBuffer(req.body)) {
      chunkBuffer = req.body;
    } else if (req.body?.chunkBase64) {
      chunkBuffer = Buffer.from(req.body.chunkBase64, 'base64');
    } else {
      return res.status(400).json({ error: 'No chunk payload received' });
    }

    const result = await storageManager.saveChunk({
      uploadId,
      chunkIndex,
      chunkBuffer,
    });

    res.json({
      success: true,
      uploadId: result.uploadId,
      chunkIndex: result.chunkIndex,
      uploadedBytes: result.uploadedBytes,
      totalBytes: result.totalBytes,
      isComplete: result.isComplete,
      receivedChunksCount: result.receivedChunksCount,
      totalChunks: result.totalChunks,
    });
  } catch (error: any) {
    console.error('Error in /api/upload/chunk:', error);
    res.status(500).json({ error: error.message });
  }
});

// JSON fallback endpoint for environments where headers are restricted
app.post('/api/upload/chunk-json', async (req: Request, res: Response) => {
  try {
    const { uploadId, chunkIndex, chunkBase64 } = req.body;
    if (!uploadId || chunkIndex === undefined || !chunkBase64) {
      return res.status(400).json({ error: 'Missing uploadId, chunkIndex, or chunkBase64' });
    }

    const chunkBuffer = Buffer.from(chunkBase64, 'base64');
    const result = await storageManager.saveChunk({
      uploadId,
      chunkIndex: parseInt(chunkIndex, 10),
      chunkBuffer,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Step C: Check upload status (enables resume without re-uploading completed chunks)
app.get('/api/upload/status/:uploadId', async (req: Request, res: Response) => {
  try {
    const session = await storageManager.getSession(req.params.uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }

    res.json({
      uploadId: session.uploadId,
      fileName: session.fileName,
      fileSizeBytes: session.fileSizeBytes,
      chunkSizeBytes: session.chunkSizeBytes,
      totalChunks: session.totalChunks,
      receivedChunks: session.receivedChunks,
      isComplete: session.receivedChunks.length >= session.totalChunks,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Step D: Complete upload & enqueue background processing job
app.post('/api/upload/complete', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId is required' });
    }

    // Assemble file without loading entire file into memory
    const fileInfo = await storageManager.completeUpload(uploadId);

    // Create durable background job
    const meta = fileInfo.examMetadata || {};
    const isVideo =
      fileInfo.mimeType.startsWith('video/') ||
      /\.(mp4|webm|mov|mkv|avi)$/i.test(fileInfo.fileName);

    const job = await jobManager.createJob({
      fileName: fileInfo.fileName,
      fileSizeBytes: fileInfo.fileSizeBytes,
      jobType: isVideo ? 'video' : 'pdf',
      sourceType: 'upload',
      documentType: meta.documentType || 'digital',
      examiningBodyId: meta.examiningBody || 'PPSC',
      examName: meta.examName || 'Competitive Examination',
      year: meta.year ? parseInt(meta.year, 10) : 2026,
      paperNumber: meta.paperNumber || 'Paper 01',
      language: meta.language || 'Bilingual',
      storagePath: fileInfo.filePath,
    });

    res.json({
      success: true,
      fileInfo: {
        fileId: fileInfo.fileId,
        fileName: fileInfo.fileName,
        fileSizeBytes: fileInfo.fileSizeBytes,
        sha256: fileInfo.sha256,
      },
      job,
    });
  } catch (error: any) {
    console.error('Error in /api/upload/complete:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. SSRF-Safe PDF & Media URL Ingestion
// ---------------------------------------------------------------------------

app.post('/api/ingestion/import-url', async (req: Request, res: Response) => {
  try {
    const { url, examMetadata } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    // Step 1: Pre-validate URL syntax and target IP against private/metadata subnets
    const validation = await validateUrlForSsrf(url);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Security Policy Violation: SSRF Protection Blocked URL',
        details: validation.errorMessage,
      });
    }

    // Step 2: Stream download safely to authorized storage
    const fileId = `url-${crypto.randomUUID()}`;
    const tempDest = path.join(SERVER_CONFIG.TEMP_CHUNKS_DIR, `${fileId}.tmp`);

    const downloadResult = await safeDownloadUrl(
      url,
      tempDest,
      SERVER_CONFIG.MAX_URL_DOWNLOAD_SIZE_BYTES
    );

    // Move to permanent storage
    const finalExt = downloadResult.isPdf ? '.pdf' : path.extname(downloadResult.fileName) || '.pdf';
    const finalPath = path.join(SERVER_CONFIG.STORAGE_DIR, `${fileId}${finalExt}`);
    await fs.rename(downloadResult.filePath, finalPath);

    const isVideo =
      downloadResult.mimeType.startsWith('video/') ||
      /\.(mp4|webm|mov|mkv|avi)$/i.test(downloadResult.fileName);

    const meta = examMetadata || {};
    const job = await jobManager.createJob({
      fileName: downloadResult.fileName,
      fileSizeBytes: downloadResult.fileSizeBytes,
      jobType: isVideo ? 'video' : 'pdf',
      sourceType: 'url',
      sourceUrl: url,
      documentType: meta.documentType || 'digital',
      examiningBodyId: meta.examiningBody || 'PPSC',
      examName: meta.examName || 'Imported Past Paper',
      year: meta.year ? parseInt(meta.year, 10) : 2026,
      paperNumber: meta.paperNumber || 'Paper 01',
      language: meta.language || 'Bilingual',
      storagePath: finalPath,
    });

    res.json({
      success: true,
      downloadResult: {
        fileName: downloadResult.fileName,
        fileSizeBytes: downloadResult.fileSizeBytes,
        mimeType: downloadResult.mimeType,
      },
      job,
    });
  } catch (error: any) {
    console.error('Error in /api/ingestion/import-url:', error);
    res.status(400).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Background Job Management Endpoints
// ---------------------------------------------------------------------------

// List all jobs
app.get('/api/jobs', (_req: Request, res: Response) => {
  res.json({ jobs: jobManager.getAllJobs() });
});

// Get single job details
app.get('/api/jobs/:jobId', (req: Request, res: Response) => {
  const job = jobManager.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ job });
});

// Retry a failed job safely and idempotently
app.post('/api/jobs/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const job = await jobManager.retryJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel an active job
app.post('/api/jobs/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    const success = await jobManager.cancelJob(req.params.jobId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Existing AI Endpoints (Legacy compatibility & immediate previews)
// ---------------------------------------------------------------------------

app.post('/api/gemini/extract-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, sampleText, examMetadata, documentType, conversionMode } = req.body;

    if (!pdfBase64 && !sampleText) {
      return res.status(400).json({ error: 'Either pdfBase64 or sampleText is required' });
    }

    const isGenerationMode = conversionMode === 'generate_from_content';

    const systemInstruction = isGenerationMode
      ? `You are an expert civil service examination item writer and educational assessment specialist for Pakistan competitive tests (CSS, PMS, PPSC, FPSC).
Your task is to analyze the provided study material, textbook chapter, or notes, and automatically generate high-yield multiple-choice questions (MCQs) testing understanding of key facts, concepts, dates, and definitions.
- Produce questions in standard Pakistani competitive testing format.
- Support both English and Urdu (Nastaliq script) or bilingual questions as appropriate for the content.
- For each question provide:
  - questionNumber (integer)
  - questionText (clear, unambiguous question stem)
  - originalQuestionText (source concept or sentence from the text)
  - language ('English' or 'Urdu' or 'Bilingual')
  - options: 4 distinct options with label 'A', 'B', 'C', 'D' and realistic distractors.
  - correctOptionLabel: the authoritative correct answer ('A', 'B', 'C', or 'D').
  - sourcePage: page number (default 1)
  - extractionConfidence: 0.95
  - hasMissingOptions: false
  - subject: 'Pakistan Affairs' | 'Islamic Studies' | 'General Knowledge' | 'Everyday Science' | 'Current Affairs' | 'English' | 'Urdu' | 'Mathematics & Reasoning' | 'Computer Science'
  - detectedExplanation: clear explanation of why this answer is correct based on the provided text.
- Maintain academic rigor and high pedagogical quality.`
      : `You are an expert competitive exam document and OCR parser specializing in Pakistani recruitment papers (PPSC, FPSC, SPSC, KPPSC, BPSC, NTS).
Your task is to parse past examination papers and extract every multiple-choice question.
- Accurately process both digital text and scanned image-based OCR pages.
- Support both English and Urdu (Nastaliq script) and bilingual questions.
- For each question identify:
  - questionNumber (integer)
  - questionText (cleaned full question stem)
  - originalQuestionText (verbatim raw text from source)
  - language ('English' or 'Urdu' or 'Bilingual')
  - options: array of objects with label ('A', 'B', 'C', 'D' etc) and text. Flag if options are missing or incomplete.
  - correctOptionLabel: only extract if an answer key is clearly present on the paper or provided in a key section; otherwise leave null/undefined. NEVER invent an answer key.
  - sourcePage: page number (default 1)
  - extractionConfidence: float between 0.0 and 1.0 (lower if text was blurry or scanned)
  - hasMissingOptions: boolean (true if question has fewer than 4 options or missing distractors)
  - subject: 'Pakistan Affairs' | 'Islamic Studies' | 'General Knowledge' | 'Everyday Science' | 'Current Affairs' | 'English' | 'Urdu' | 'Mathematics & Reasoning' | 'Computer Science'
  - detectedExplanation: brief explanation or context if supplied on paper.
- Preserve original numbering and source references.`;

    let contentsParts: any[] = [];
    const isScanned = documentType === 'scanned';

    if (pdfBase64 && pdfBase64.startsWith('data:application/pdf;base64,') && pdfBase64.length > 500) {
      contentsParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
        },
      });
      contentsParts.push({
        text: `Extract and structure all past paper questions from this ${isScanned ? 'scanned OCR' : 'digital'} PDF for ${examMetadata?.examiningBody || 'PPSC'} - ${examMetadata?.examName || 'Competitive Exam'} (${examMetadata?.year || '2026'}). Also provide a rawTextPreview of the first 200 words.`,
      });
    } else {
      const textToParse = sampleText || `
PUNJAB PUBLIC SERVICE COMMISSION (PPSC)
TEHSILDAR / NAIB TEHSILDAR COMPETITIVE EXAMINATION

Q1. The Indus Basin Treaty 1960 allocated the waters of which three eastern rivers exclusively to India?
(A) Indus, Jhelum, Chenab
(B) Ravi, Beas, Sutlej
(C) Kabul, Swat, Kurram
(D) Chenab, Ravi, Jhelum
[Official Key: B]

Q2. Who was the Viceroy of India during the 1905 Partition of Bengal?
(A) Lord Curzon
(B) Lord Mountbatten
(C) Lord Minto
(D) Lord Wavell
[Official Key: A]

Q3. اردو کی پہلی نثری داستان "سب رس" کے مصنف کا نام کیا ہے؟
(A) ملا وجہی
(B) میر امن دہلوی
(C) رجب علی بیگ سرور
(D) مرزا غالب
[Official Key: A]

Q4. What is the escape velocity of an object from Earth's gravitational field?
(A) 9.8 km/s
(B) 11.2 km/s
(C) 15.6 km/s
(D) 7.9 km/s
[Official Key: B]
      `;

      contentsParts.push({
        text: `Extract and structure all past paper MCQs from the following ${isScanned ? 'scanned OCR' : 'digital'} test text:\n\n${textToParse}`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contentsParts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedExamTitle: { type: Type.STRING },
            totalPages: { type: Type.INTEGER },
            rawTextPreview: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.INTEGER },
                  questionText: { type: Type.STRING },
                  originalQuestionText: { type: Type.STRING },
                  language: { type: Type.STRING, enum: ['English', 'Urdu', 'Bilingual'] },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E'] },
                        text: { type: Type.STRING },
                      },
                      required: ['label', 'text'],
                    },
                  },
                  correctOptionLabel: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', 'E'] },
                  sourcePage: { type: Type.INTEGER },
                  extractionConfidence: { type: Type.NUMBER },
                  hasMissingOptions: { type: Type.BOOLEAN },
                  subject: { type: Type.STRING },
                  detectedExplanation: { type: Type.STRING },
                },
                required: ['questionNumber', 'questionText', 'language', 'options', 'extractionConfidence', 'subject'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json(parsedJson);
  } catch (error: any) {
    console.error('Error in /api/gemini/extract-pdf:', error);
    return res.status(500).json({
      error: 'Failed to process document with Gemini AI',
      details: error.message,
    });
  }
});

app.post('/api/gemini/explain-question', async (req: Request, res: Response) => {
  try {
    const { questionText, options, correctOptionLabel, subject, language } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }

    const prompt = `As a Pakistani civil service exam instructor (PPSC/FPSC/PMS/CSS), provide an authoritative, pedagogical explanation for why the selected answer is correct.
Question: ${questionText}
Options: ${JSON.stringify(options)}
Correct Option: ${correctOptionLabel || 'Not specified'}
Subject: ${subject || 'General Knowledge'}
Language: ${language || 'English'}

Include:
1. Direct explanation of the correct fact/reasoning.
2. Context (e.g. historical treaty, constitutional article, scientific law, or grammatical rule).
3. Why other options are incorrect or common distractor traps.
Keep it concise, clear, and focused under 150 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({
      explanation: response.text,
      isAiGenerated: true,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/explain-question:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation',
      details: error.message,
    });
  }
});

// Rapid Chapter Outline Generation (Syllabus & Modules Extraction)
app.post('/api/gemini/generate-outline', async (req: Request, res: Response) => {
  try {
    const { fileName, sampleText, pdfBase64, examMetadata } = req.body;
    const outline = await generateDocumentOutline({
      fileName,
      sampleText,
      pdfBase64,
      examMetadata,
    });
    return res.json(outline);
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-outline:', error);
    return res.status(500).json({
      error: 'Failed to generate document outline',
      details: error.message,
    });
  }
});

// Targeted Chapter MCQs Generation on demand
app.post('/api/gemini/generate-chapter-mcqs', async (req: Request, res: Response) => {
  try {
    const { chapterTitle, keyTopics, subject, count, difficulty, examMetadata, paperId } = req.body;

    if (!chapterTitle) {
      return res.status(400).json({ error: 'chapterTitle is required' });
    }

    const questions = await generateChapterMcqs({
      chapterTitle,
      keyTopics: Array.isArray(keyTopics) ? keyTopics : [],
      subject: subject || 'General Knowledge',
      count: count ? parseInt(count, 10) : 5,
      difficulty: difficulty || 'Medium',
      examMetadata,
      paperId,
    });

    return res.json({ questions });
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-chapter-mcqs:', error);
    return res.status(500).json({
      error: 'Failed to generate chapter MCQs',
      details: error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// 6. Vite middleware / Static Asset Server
// ---------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamPilot Pakistan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
