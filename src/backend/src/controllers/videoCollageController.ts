import { Request, Response } from 'express';
import { videoCollageService } from '../services/videoCollageService.js';
import path from 'path';
import { promisify } from 'util';
import { unlink } from 'fs/promises';

export class VideoCollageController {
  async mergeVideos(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || req.files.length === 0) {
        res.status(400).json({
          error: 'No video files provided',
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      const outputFilename = req.body.outputFilename || `collage-${Date.now()}.mp4`;

      // Convert multer files to VideoFile format
      const videoFiles = files.map((file) => ({
        filename: file.originalname,
        path: file.path,
      }));

      console.log(`Processing ${videoFiles.length} videos...`);

      // Merge videos
      const outputPath = await videoCollageService.mergeVideos(
        videoFiles,
        path.basename(outputFilename)
      );

      // Read the output file
      const fileData = await videoCollageService.readFile(outputPath);

      // Set response headers
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${outputFilename}"`
      );
      res.setHeader('Content-Length', fileData.length);

      // Send the file
      res.send(fileData);

      // Cleanup after sending (async, non-blocking)
      setTimeout(async () => {
        try {
          const sessionDir = path.dirname(outputPath);
          await videoCollageService.cleanup(sessionDir);
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Video merge error:', error);

      // Cleanup uploaded files
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          try {
            await unlink((file as Express.Multer.File).path);
          } catch (err) {
            console.error('Failed to delete uploaded file:', err);
          }
        }
      }

      res.status(500).json({
        error: 'Failed to merge videos',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createGridCollage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || req.files.length === 0) {
        res.status(400).json({
          error: 'No video files provided',
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      const cols = parseInt(req.body.cols || '2', 10);
      const outputFilename = req.body.outputFilename || `grid-collage-${Date.now()}.mp4`;

      // Convert multer files to VideoFile format
      const videoFiles = files.map((file) => ({
        filename: file.originalname,
        path: file.path,
      }));

      console.log(`Creating ${cols}x${Math.ceil(videoFiles.length / cols)} grid collage...`);

      // Create grid collage
      const outputPath = await videoCollageService.createCollageGrid(videoFiles, cols);

      // Read the output file
      const fileData = await videoCollageService.readFile(outputPath);

      // Set response headers
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${outputFilename}"`
      );
      res.setHeader('Content-Length', fileData.length);

      // Send the file
      res.send(fileData);

      // Cleanup after sending (async, non-blocking)
      setTimeout(async () => {
        try {
          const sessionDir = path.dirname(outputPath);
          await videoCollageService.cleanup(sessionDir);
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Grid collage error:', error);

      // Cleanup uploaded files
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          try {
            await unlink((file as Express.Multer.File).path);
          } catch (err) {
            console.error('Failed to delete uploaded file:', err);
          }
        }
      }

      res.status(500).json({
        error: 'Failed to create grid collage',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const videoCollageController = new VideoCollageController();
