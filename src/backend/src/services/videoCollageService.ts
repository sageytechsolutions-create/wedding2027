import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

interface VideoFile {
  filename: string;
  path: string;
}

export class VideoCollageService {
  private tempDir: string;

  constructor(tempDir: string = '/tmp/video-collage') {
    this.tempDir = tempDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async mergeVideos(videoFiles: VideoFile[], outputFilename: string): Promise<string> {
    const sessionId = Date.now().toString();
    const sessionDir = path.join(this.tempDir, sessionId);

    try {
      await fs.mkdir(sessionDir, { recursive: true });

      // Create concat file for FFmpeg
      const concatFile = path.join(sessionDir, 'concat.txt');
      const concatContent = videoFiles
        .map((file) => `file '${file.path}'`)
        .join('\n');

      await fs.writeFile(concatFile, concatContent);

      // Prepare output path
      const outputPath = path.join(sessionDir, outputFilename);

      // Use ffmpeg to concatenate videos
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions([
            '-c:v',
            'libx264',
            '-preset',
            'medium',
            '-crf',
            '23',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
          ])
          .on('end', () => {
            console.log(`Video merge completed: ${outputPath}`);
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(new Error(`Video processing failed: ${err.message}`));
          })
          .on('progress', (progress) => {
            console.log(`Processing: ${Math.round(progress.percent)}%`);
          })
          .save(outputPath);
      });

      return outputPath;
    } catch (error) {
      await this.cleanup(sessionDir);
      throw error;
    }
  }

  async createCollageGrid(videoFiles: VideoFile[], cols: number = 2): Promise<string> {
    const sessionId = Date.now().toString();
    const sessionDir = path.join(this.tempDir, sessionId);

    try {
      await fs.mkdir(sessionDir, { recursive: true });

      // For grid layout, we'll create a video with tiled layout
      // This is a more complex operation - creating an FFmpeg filter complex
      const rows = Math.ceil(videoFiles.length / cols);
      const tileFilter = this.generateTileFilter(videoFiles, cols, rows);

      const outputPath = path.join(sessionDir, 'collage.mp4');

      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg();

        // Add each video as input
        videoFiles.forEach((file) => {
          command = command.input(file.path);
        });

        command
          .complexFilter(tileFilter)
          .outputOptions([
            '-c:v',
            'libx264',
            '-preset',
            'medium',
            '-crf',
            '23',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
          ])
          .on('end', () => {
            console.log(`Grid collage created: ${outputPath}`);
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(new Error(`Grid creation failed: ${err.message}`));
          })
          .save(outputPath);
      });

      return outputPath;
    } catch (error) {
      await this.cleanup(sessionDir);
      throw error;
    }
  }

  private generateTileFilter(
    videoFiles: VideoFile[],
    cols: number,
    rows: number
  ): string {
    const videoCount = videoFiles.length;
    const scaleSize = '320x240';

    // Scale all videos and pad them
    let filter = '';

    for (let i = 0; i < videoCount; i++) {
      filter += `[${i}]scale=${scaleSize}[v${i}];`;
    }

    // Concatenate videos horizontally and vertically
    for (let row = 0; row < rows; row++) {
      let rowFilter = '';
      const startIdx = row * cols;
      const endIdx = Math.min(startIdx + cols, videoCount);

      for (let i = startIdx; i < endIdx; i++) {
        rowFilter += `[v${i}]`;
      }

      const rowCols = endIdx - startIdx;
      rowFilter += `hstack=inputs=${rowCols}[row${row}];`;
      filter += rowFilter;
    }

    // Stack rows vertically
    let finalStack = '';
    for (let row = 0; row < rows; row++) {
      finalStack += `[row${row}]`;
    }
    finalStack += `vstack=inputs=${rows}[out]`;
    filter += finalStack;

    return filter;
  }

  async cleanup(sessionDir: string): Promise<void> {
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }

  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }
}

export const videoCollageService = new VideoCollageService();
