import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { videoCollageController } from '../controllers/videoCollageController.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp/video-uploads');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    // Only accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file
  },
});

// Merge videos sequentially (max 15 videos)
router.post('/merge', upload.array('videos', 15), async (req, res) => {
  await videoCollageController.mergeVideos(req, res);
});

// Create grid collage (max 15 videos)
router.post('/grid', upload.array('videos', 15), async (req, res) => {
  await videoCollageController.createGridCollage(req, res);
});

export default router;
