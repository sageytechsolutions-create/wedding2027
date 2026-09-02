import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth';
import { db } from '../config/database';
import { PropertySyncService } from '../services/syncService';
import { ZillowAdapter } from '../adapters/zillow';

const router = Router();
const syncService = new PropertySyncService(db, new ZillowAdapter());

/**
 * POST /api/sync/properties - Manually trigger property sync
 * Admin only
 */
router.post('/properties', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { city, state, filters } = req.body;

    if (!city || !state) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'city and state are required',
          statusCode: 400,
        },
      });
    }

    const result = await syncService.syncPropertiesByLocation(city, state, filters);

    res.json({
      data: {
        message: 'Sync completed',
        ...result,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: {
        code: 'SYNC_ERROR',
        message: 'Failed to sync properties',
        statusCode: 500,
      },
    });
  }
});

/**
 * POST /api/sync/cleanup - Remove inactive listings
 * Admin only
 */
router.post('/cleanup', verifyAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await syncService.cleanupInactiveListings();

    res.json({
      data: {
        message: 'Cleanup completed',
        deleted,
      },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: {
        code: 'CLEANUP_ERROR',
        message: 'Failed to cleanup properties',
        statusCode: 500,
      },
    });
  }
});

/**
 * POST /api/sync/update-valuations - Update property valuations
 * Admin only
 */
router.post('/update-valuations', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { city, state } = req.body;

    if (!city || !state) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'city and state are required',
          statusCode: 400,
        },
      });
    }

    const updated = await syncService.updatePropertyValuations(city, state);

    res.json({
      data: {
        message: 'Valuations updated',
        updated,
      },
    });
  } catch (error) {
    console.error('Valuation update error:', error);
    res.status(500).json({
      error: {
        code: 'VALUATION_ERROR',
        message: 'Failed to update valuations',
        statusCode: 500,
      },
    });
  }
});

/**
 * GET /api/sync/stats - Get sync statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await syncService.getSyncStats();

    res.json({
      data: stats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to fetch stats',
        statusCode: 500,
      },
    });
  }
});

export default router;
