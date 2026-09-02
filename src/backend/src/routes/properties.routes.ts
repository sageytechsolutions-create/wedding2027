import { Router } from 'express';
import { PropertyController } from '../controllers/propertyController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public endpoints
router.get('/', optionalAuth, PropertyController.search);
router.get('/:id', PropertyController.getById);

// Protected endpoints
router.post('/:propertyId/favorites', requireAuth, PropertyController.addToFavorites);
router.delete('/:propertyId/favorites', requireAuth, PropertyController.removeFromFavorites);
router.get('/favorites', requireAuth, PropertyController.getFavorites);

export default router;
