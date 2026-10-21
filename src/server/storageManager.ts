/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { SERVER_CONFIG, formatBytes } from './config';

export interface UploadSessionMeta {
  uploadId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  chunkSizeBytes: number;
  totalChunks: number;
  receivedChunks: number[];
  examMetadata: any;
  createdAt: number;
  expiresAt: number;
}

export interface StoredFileInfo {
  fileId: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256: string;
  examMetadata: any;
  createdAt: number;
}

export class StorageManager {
  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fsp.mkdir(SERVER_CONFIG.DATA_DIR, { recursive: true });
      await fsp.mkdir(SERVER_CONFIG.TEMP_CHUNKS_DIR, { recursive: true });
      await fsp.mkdir(SERVER_CONFIG.STORAGE_DIR, { recursive: true });
    } catch (err: any) {
      console.error('[StorageManager] Error initializing directories:', err.message);
    }
  }

  // Initialize a new chunked upload session
  async initSession(params: {
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    chunkSizeBytes?: number;
    examMetadata?: any;
  }): Promise<UploadSessionMeta> {
    await this.ensureDirectories();

    // Check maximum deployment limit
    if (params.fileSizeBytes > SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(
        `File size (${formatBytes(params.fileSizeBytes)}) exceeds maximum deployment limit of ${formatBytes(SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES)}. Consider splitting multi-year exam papers or compressing high-resolution video.`
      );
    }

    const uploadId = `up-${crypto.randomUUID()}`;
    const chunkDir = path.join(SERVER_CONFIG.TEMP_CHUNKS_DIR, uploadId);
    await fsp.mkdir(chunkDir, { recursive: true });

    const chunkSizeBytes = params.chunkSizeBytes || SERVER_CONFIG.UPLOAD_CHUNK_SIZE_BYTES;
    const totalChunks = Math.max(1, Math.ceil(params.fileSizeBytes / chunkSizeBytes));
    const now = Date.now();

    const meta: UploadSessionMeta = {
      uploadId,
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      mimeType: params.mimeType,
      chunkSizeBytes,
      totalChunks,
      receivedChunks: [],
      examMetadata: params.examMetadata || {},
      createdAt: now,
      expiresAt: now + SERVER_CONFIG.CHUNK_EXPIRY_MS,
    };

    await fsp.writeFile(path.join(chunkDir, 'meta.json'), JSON.stringify(meta, null, 2));
    return meta;
  }

  // Get current status of an upload session (for resuming)
  async getSession(uploadId: string): Promise<UploadSessionMeta | null> {
    const metaPath = path.join(SERVER_CONFIG.TEMP_CHUNKS_DIR, uploadId, 'meta.json');
    try {
      const data = await fsp.readFile(metaPath, 'utf8');
      return JSON.parse(data) as UploadSessionMeta;
    } catch {
      return null;
    }
  }

  // Save an individual chunk to disk
  async saveChunk(params: {
    uploadId: string;
    chunkIndex: number;
    chunkBuffer: Buffer;
  }): Promise<{
    uploadId: string;
    chunkIndex: number;
    uploadedBytes: number;
    totalBytes: number;
    isComplete: boolean;
    receivedChunksCount: number;
    totalChunks: number;
  }> {
    const meta = await this.getSession(params.uploadId);
    if (!meta) {
      throw new Error(`Upload session "${params.uploadId}" not found or expired.`);
    }

    if (Date.now() > meta.expiresAt) {
      throw new Error('Upload session expired. Please re-initiate.');
    }

    const chunkDir = path.join(SERVER_CONFIG.TEMP_CHUNKS_DIR, params.uploadId);
    const chunkPath = path.join(chunkDir, `chunk_${params.chunkIndex}`);

    await fsp.writeFile(chunkPath, params.chunkBuffer);

    // Update received chunks in metadata
    if (!meta.receivedChunks.includes(params.chunkIndex)) {
      meta.receivedChunks.push(params.chunkIndex);
      meta.receivedChunks.sort((a, b) => a - b);
      await fsp.writeFile(path.join(chunkDir, 'meta.json'), JSON.stringify(meta, null, 2));
    }

    const isComplete = meta.receivedChunks.length >= meta.totalChunks;
    const uploadedBytes = Math.min(
      meta.fileSizeBytes,
      meta.receivedChunks.length * meta.chunkSizeBytes
    );

    return {
      uploadId: params.uploadId,
      chunkIndex: params.chunkIndex,
      uploadedBytes,
      totalBytes: meta.fileSizeBytes,
      isComplete,
      receivedChunksCount: meta.receivedChunks.length,
      totalChunks: meta.totalChunks,
    };
  }

  // Finalize upload: concatenate chunks via streaming without excessive memory usage
  async completeUpload(uploadId: string): Promise<StoredFileInfo> {
    const meta = await this.getSession(uploadId);
    if (!meta) {
      throw new Error(`Upload session "${uploadId}" not found.`);
    }

    const chunkDir = path.join(SERVER_CONFIG.TEMP_CHUNKS_DIR, uploadId);

    // Verify all chunks exist
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      try {
        await fsp.access(chunkPath);
      } catch {
        throw new Error(
          `Cannot complete upload: missing chunk #${i} of ${meta.totalChunks}. Resume upload to provide missing chunks.`
        );
      }
    }

    const fileExt = path.extname(meta.fileName) || (meta.mimeType.includes('pdf') ? '.pdf' : '.mp4');
    const fileId = `file-${crypto.randomUUID()}`;
    const finalFileName = `${fileId}${fileExt}`;
    const finalFilePath = path.join(SERVER_CONFIG.STORAGE_DIR, finalFileName);

    // Stream concatenate chunks to avoid loading whole large file into memory
    const writeStream = fs.createWriteStream(finalFilePath);
    const hash = crypto.createHash('sha256');
    let totalBytesWritten = 0;

    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      const chunkData = await fsp.readFile(chunkPath);
      hash.update(chunkData);
      totalBytesWritten += chunkData.length;
      await new Promise<void>((resolve, reject) => {
        if (!writeStream.write(chunkData)) {
          writeStream.once('drain', resolve);
        } else {
          resolve();
        }
      });
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });

    const sha256 = hash.digest('hex');

    // Clean up temporary chunks folder
    try {
      await fsp.rm(chunkDir, { recursive: true, force: true });
    } catch (err: any) {
      console.warn(`[StorageManager] Failed to clean chunk dir:`, err.message);
    }

    return {
      fileId,
      fileName: meta.fileName,
      filePath: finalFilePath,
      fileSizeBytes: totalBytesWritten,
      mimeType: meta.mimeType,
      sha256,
      examMetadata: meta.examMetadata,
      createdAt: Date.now(),
    };
  }

  // Get total storage usage statistics
  async getStorageStats(): Promise<{ totalFiles: number; totalSizeBytes: number }> {
    await this.ensureDirectories();
    try {
      const files = await fsp.readdir(SERVER_CONFIG.STORAGE_DIR);
      let totalSizeBytes = 0;
      let totalFiles = 0;

      for (const file of files) {
        try {
          const stat = await fsp.stat(path.join(SERVER_CONFIG.STORAGE_DIR, file));
          if (stat.isFile()) {
            totalSizeBytes += stat.size;
            totalFiles++;
          }
        } catch {}
      }

      return { totalFiles, totalSizeBytes };
    } catch {
      return { totalFiles: 0, totalSizeBytes: 0 };
    }
  }

  // Delete stored file
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fsp.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const storageManager = new StorageManager();
