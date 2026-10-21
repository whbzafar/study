/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

export const SERVER_CONFIG = {
  // Configurable deployment limits (no hardcoded 50MB restriction)
  MAX_UPLOAD_SIZE_BYTES: process.env.MAX_UPLOAD_SIZE_BYTES
    ? parseInt(process.env.MAX_UPLOAD_SIZE_BYTES, 10)
    : 2 * 1024 * 1024 * 1024, // 2 GB scalable limit

  UPLOAD_CHUNK_SIZE_BYTES: process.env.UPLOAD_CHUNK_SIZE_BYTES
    ? parseInt(process.env.UPLOAD_CHUNK_SIZE_BYTES, 10)
    : 5 * 1024 * 1024, // 5 MB per chunk

  MAX_URL_DOWNLOAD_SIZE_BYTES: process.env.MAX_URL_DOWNLOAD_SIZE_BYTES
    ? parseInt(process.env.MAX_URL_DOWNLOAD_SIZE_BYTES, 10)
    : 500 * 1024 * 1024, // 500 MB for external URLs

  MAX_CONCURRENT_WORKERS: process.env.MAX_CONCURRENT_WORKERS
    ? parseInt(process.env.MAX_CONCURRENT_WORKERS, 10)
    : 2,

  // Storage directories
  DATA_DIR: path.join(projectRoot, '.data'),
  TEMP_CHUNKS_DIR: path.join(projectRoot, '.data', 'temp_chunks'),
  STORAGE_DIR: path.join(projectRoot, '.data', 'storage'),
  JOBS_FILE: path.join(projectRoot, '.data', 'jobs.json'),

  // Supported media formats
  SUPPORTED_PDF_MIME_TYPES: [
    'application/pdf',
    'application/x-pdf',
  ],
  SUPPORTED_VIDEO_MIME_TYPES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/avi',
    'video/mpeg',
  ],
  SUPPORTED_EXTENSIONS: ['.pdf', '.mp4', '.webm', '.mov', '.mkv', '.avi'],

  // Request timeouts
  URL_DOWNLOAD_TIMEOUT_MS: 45000,
  CHUNK_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
