/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { VideoMetadata } from '../types';

const execFileAsync = promisify(execFile);

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

export async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    const parsed = JSON.parse(stdout);
    const duration = parseFloat(parsed.format?.duration || '0');
    const bitrate = parseInt(parsed.format?.bit_rate || '0', 10);
    const format = parsed.format?.format_name || path.extname(filePath).replace('.', '');

    let width: number | undefined;
    let height: number | undefined;
    let audioCodec: string | undefined;

    if (Array.isArray(parsed.streams)) {
      const videoStream = parsed.streams.find((s: any) => s.codec_type === 'video');
      if (videoStream) {
        width = videoStream.width;
        height = videoStream.height;
      }
      const audioStream = parsed.streams.find((s: any) => s.codec_type === 'audio');
      if (audioStream) {
        audioCodec = audioStream.codec_name;
      }
    }

    return {
      durationSeconds: Math.round(duration * 10) / 10,
      width,
      height,
      format,
      audioCodec,
      bitrate,
    };
  } catch (error: any) {
    console.warn('[MediaProcessor] ffprobe extraction failed or not available:', error.message);
    // Fallback basic metadata
    const stat = await fs.stat(filePath);
    return {
      durationSeconds: 0,
      format: path.extname(filePath).replace('.', ''),
      bitrate: Math.round((stat.size * 8) / 60), // estimate
    };
  }
}

// Extract lightweight mono MP3 audio track for speech-to-text processing
export async function extractAudioTrack(videoFilePath: string, outputAudioPath: string): Promise<string> {
  try {
    await execFileAsync('ffmpeg', [
      '-y', // overwrite
      '-i',
      videoFilePath,
      '-vn', // no video
      '-acodec',
      'libmp3lame',
      '-ar',
      '16000', // 16kHz sample rate optimal for speech recognition
      '-ac',
      '1', // mono
      '-b:a',
      '64k', // 64kbps light footprint
      outputAudioPath,
    ]);

    return outputAudioPath;
  } catch (error: any) {
    console.error('[MediaProcessor] ffmpeg audio extraction error:', error.message);
    throw new Error(`FFmpeg audio extraction failed: ${error.message}`);
  }
}

// Sample representative frames at specific intervals for visual slide/board notes
export async function extractSampleFrames(
  videoFilePath: string,
  outputDir: string,
  timestampsSec: number[]
): Promise<string[]> {
  const generatedFrames: string[] = [];

  for (let i = 0; i < Math.min(timestampsSec.length, 5); i++) {
    const sec = timestampsSec[i];
    const framePath = path.join(outputDir, `frame_${i}_${Math.round(sec)}s.jpg`);
    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss',
        sec.toString(),
        '-i',
        videoFilePath,
        '-vframes',
        '1',
        '-q:v',
        '3',
        framePath,
      ]);
      generatedFrames.push(framePath);
    } catch (err: any) {
      console.warn(`[MediaProcessor] Frame extraction skipped at ${sec}s:`, err.message);
    }
  }

  return generatedFrames;
}
