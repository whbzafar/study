/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import crypto from 'crypto';
import { storageManager } from './storageManager';
import { SERVER_CONFIG } from './config';

test('storageManager initiates chunked upload session and tracks progress', async () => {
  const fileName = 'test_past_paper.pdf';
  const fileSize = 12 * 1024 * 1024; // 12 MB (spans multiple 5MB chunks)

  const session = await storageManager.initSession({
    fileName,
    fileSizeBytes: fileSize,
    mimeType: 'application/pdf',
    examMetadata: { examiningBody: 'PPSC', year: 2026 },
  });

  assert.ok(session.uploadId.startsWith('up-'));
  assert.equal(session.fileName, fileName);
  assert.equal(session.totalChunks, Math.ceil(fileSize / SERVER_CONFIG.UPLOAD_CHUNK_SIZE_BYTES));
  assert.equal(session.receivedChunks.length, 0);

  // Status before chunks
  const status1 = await storageManager.getSession(session.uploadId);
  assert.equal(status1?.receivedChunks.length, 0);
});

test('storageManager rejects files that exceed deployment capacity with clear message', async () => {
  const massiveSize = SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES + 1024 * 1024;

  await assert.rejects(
    async () => {
      await storageManager.initSession({
        fileName: 'oversized.mp4',
        fileSizeBytes: massiveSize,
        mimeType: 'video/mp4',
      });
    },
    /exceeds maximum deployment limit/
  );
});

test('storageManager streams, concatenates chunks and cleans up temporary resources', async () => {
  // Generate sample payload with 3 chunks
  const chunk1 = Buffer.from('Chunk #1: Header & CSS Syllabus\n');
  const chunk2 = Buffer.from('Chunk #2: PPSC Question Bank digitized\n');
  const chunk3 = Buffer.from('Chunk #3: Official Answer Keys validated\n');
  const fullContent = Buffer.concat([chunk1, chunk2, chunk3]);
  const expectedHash = crypto.createHash('sha256').update(fullContent).digest('hex');

  const session = await storageManager.initSession({
    fileName: 'sample_exam.pdf',
    fileSizeBytes: fullContent.length,
    mimeType: 'application/pdf',
    chunkSizeBytes: Math.ceil(fullContent.length / 3),
  });

  // Save each chunk
  await storageManager.saveChunk({
    uploadId: session.uploadId,
    chunkIndex: 0,
    chunkBuffer: chunk1,
  });

  await storageManager.saveChunk({
    uploadId: session.uploadId,
    chunkIndex: 1,
    chunkBuffer: chunk2,
  });

  const res3 = await storageManager.saveChunk({
    uploadId: session.uploadId,
    chunkIndex: 2,
    chunkBuffer: chunk3,
  });

  assert.equal(res3.isComplete, true);
  assert.equal(res3.receivedChunksCount, 3);

  // Finalize assembly
  const fileInfo = await storageManager.completeUpload(session.uploadId);

  assert.equal(fileInfo.fileSizeBytes, fullContent.length);
  assert.equal(fileInfo.sha256, expectedHash);

  // Verify file on disk
  const diskData = await fs.readFile(fileInfo.filePath);
  assert.equal(diskData.toString(), fullContent.toString());

  // Clean up test file
  await storageManager.deleteFile(fileInfo.filePath);
});
