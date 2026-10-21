/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { SERVER_CONFIG } from './config';

// Check if an IPv4 or IPv6 address belongs to private/reserved ranges
export function isPrivateIp(ip: string): boolean {
  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(ip)) return true;

  // IPv4 Private Networks:
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;

  // Link-Local / AWS/GCP Cloud Metadata (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;

  // 0.0.0.0 / Current Network
  if (/^0\./.test(ip) || ip === '0.0.0.0') return true;

  // Carrier Grade NAT (100.64.0.0/10)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(ip)) return true;

  // IPv6 checks
  if (ip === '::1' || ip === '::') return true;
  if (/^fe80:/i.test(ip)) return true; // Link-local
  if (/^f[cd]/i.test(ip)) return true; // Unique local (fc00::/7)
  if (/^::ffff:127\./i.test(ip)) return true; // IPv4-mapped loopback
  if (/^::ffff:10\./i.test(ip)) return true;
  if (/^::ffff:192\.168\./i.test(ip)) return true;
  if (/^::ffff:169\.254\./i.test(ip)) return true;

  return false;
}

export interface UrlValidationResult {
  isValid: boolean;
  sanitizedUrl?: URL;
  resolvedIp?: string;
  errorMessage?: string;
}

// Validate URL syntax, protocol, and DNS target against SSRF attacks
export async function validateUrlForSsrf(urlString: string): Promise<UrlValidationResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString.trim());
  } catch {
    return { isValid: false, errorMessage: 'Invalid URL format' };
  }

  // Enforce HTTP or HTTPS only
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      isValid: false,
      errorMessage: `Unsupported protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost, broadcast, and obvious cloud metadata aliases
  const blockedHostnames = [
    'localhost',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    '169.254.169.254',
    '0.0.0.0',
    '127.0.0.1',
    '::1',
  ];

  if (blockedHostnames.includes(hostname) || hostname.endsWith('.localhost')) {
    return {
      isValid: false,
      errorMessage: `Access to private or local host "${hostname}" is forbidden.`,
    };
  }

  // Resolve hostname via DNS to inspect target IP address
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { isValid: false, errorMessage: `Could not resolve hostname "${hostname}"` };
    }

    for (const addressEntry of lookupResult) {
      if (isPrivateIp(addressEntry.address)) {
        return {
          isValid: false,
          errorMessage: `Hostname "${hostname}" resolves to protected or internal IP (${addressEntry.address}). Access denied.`,
        };
      }
    }

    return {
      isValid: true,
      sanitizedUrl: parsedUrl,
      resolvedIp: lookupResult[0].address,
    };
  } catch (error: any) {
    return {
      isValid: false,
      errorMessage: `DNS resolution failed for "${hostname}": ${error.message}`,
    };
  }
}

export interface DownloadResult {
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  fileName: string;
  isPdf: boolean;
  sha256?: string;
}

// Safe streaming download with size limits, timeout, redirect validation, and magic byte check
export async function safeDownloadUrl(
  targetUrl: string,
  destPath: string,
  maxSizeBytes: number = SERVER_CONFIG.MAX_URL_DOWNLOAD_SIZE_BYTES,
  maxRedirects = 5
): Promise<DownloadResult> {
  let currentUrl = targetUrl;
  let redirectsFollowed = 0;

  while (redirectsFollowed <= maxRedirects) {
    const validation = await validateUrlForSsrf(currentUrl);
    if (!validation.isValid || !validation.sanitizedUrl) {
      throw new Error(`SSRF Blocked: ${validation.errorMessage}`);
    }

    const parsedUrl = validation.sanitizedUrl;
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const downloadPromise = new Promise<DownloadResult>((resolve, reject) => {
      const req = client.get(
        parsedUrl,
        {
          headers: {
            'User-Agent': 'ExamPilot-Pakistan/2.0 (Past Paper Ingestion Engine)',
            Accept: 'application/pdf, video/mp4, video/*, */*',
          },
          timeout: SERVER_CONFIG.URL_DOWNLOAD_TIMEOUT_MS,
        },
        (res) => {
          // Handle HTTP redirects (301, 302, 303, 307, 308)
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location
          ) {
            const redirectUrl = new URL(res.headers.location, parsedUrl).toString();
            res.resume(); // Discard stream data
            resolve({
              filePath: '',
              fileSizeBytes: 0,
              mimeType: '',
              fileName: '',
              isPdf: false,
              sha256: redirectUrl, // used as sentinel for redirect
            });
            return;
          }

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            reject(
              new Error(
                `Remote server returned HTTP ${res.statusCode}: ${res.statusMessage || 'Download failed'}`
              )
            );
            return;
          }

          const declaredLength = res.headers['content-length']
            ? parseInt(res.headers['content-length'], 10)
            : null;

          if (declaredLength && declaredLength > maxSizeBytes) {
            res.resume();
            reject(
              new Error(
                `File size (${(declaredLength / (1024 * 1024)).toFixed(1)} MB) exceeds allowed limit of ${(maxSizeBytes / (1024 * 1024)).toFixed(0)} MB`
              )
            );
            return;
          }

          const rawContentType = (res.headers['content-type'] || '').toLowerCase();

          // Reject html pages masquerading as downloads
          if (rawContentType.includes('text/html') || rawContentType.includes('application/xhtml+xml')) {
            res.resume();
            reject(
              new Error(
                'The provided URL points to an HTML webpage rather than a directly downloadable document or media file.'
              )
            );
            return;
          }

          const fileStream = fs.createWriteStream(destPath);
          let bytesWritten = 0;
          let firstChunkCaptured = false;
          let firstChunk = Buffer.alloc(0);

          res.on('data', (chunk: Buffer) => {
            bytesWritten += chunk.length;

            if (!firstChunkCaptured && chunk.length > 0) {
              firstChunk = Buffer.from(chunk.subarray(0, Math.min(chunk.length, 16)));
              firstChunkCaptured = true;
            }

            if (bytesWritten > maxSizeBytes) {
              req.destroy();
              fileStream.destroy();
              try {
                fs.unlinkSync(destPath);
              } catch {}
              reject(
                new Error(
                  `Download exceeded maximum allowed size of ${(maxSizeBytes / (1024 * 1024)).toFixed(0)} MB`
                )
              );
              return;
            }

            fileStream.write(chunk);
          });

          res.on('end', () => {
            fileStream.end(async () => {
              // Verify magic bytes: PDF must start with %PDF- (0x25 0x50 0x44 0x46 0x2D)
              const isPdf =
                firstChunk.length >= 4 &&
                firstChunk.toString('ascii', 0, 4) === '%PDF';

              // Extract filename from header or url
              let extractedFileName = path.basename(parsedUrl.pathname) || 'downloaded_exam';
              const contentDisposition = res.headers['content-disposition'];
              if (contentDisposition) {
                const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
                if (match && match[1]) {
                  extractedFileName = decodeURIComponent(match[1]);
                }
              }

              if (isPdf && !extractedFileName.toLowerCase().endsWith('.pdf')) {
                extractedFileName += '.pdf';
              }

              resolve({
                filePath: destPath,
                fileSizeBytes: bytesWritten,
                mimeType: isPdf ? 'application/pdf' : rawContentType || 'application/octet-stream',
                fileName: extractedFileName,
                isPdf,
              });
            });
          });

          res.on('error', (err) => {
            fileStream.destroy();
            try {
              fs.unlinkSync(destPath);
            } catch {}
            reject(err);
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        try {
          fs.unlinkSync(destPath);
        } catch {}
        reject(new Error(`Download timed out after ${SERVER_CONFIG.URL_DOWNLOAD_TIMEOUT_MS / 1000} seconds`));
      });

      req.on('error', (err) => {
        try {
          fs.unlinkSync(destPath);
        } catch {}
        reject(err);
      });
    });

    const result = await downloadPromise;

    // Check if redirect
    if (result.sha256 && !result.filePath) {
      currentUrl = result.sha256;
      redirectsFollowed++;
      continue;
    }

    return result;
  }

  throw new Error(`Exceeded maximum allowed redirects (${maxRedirects})`);
}
