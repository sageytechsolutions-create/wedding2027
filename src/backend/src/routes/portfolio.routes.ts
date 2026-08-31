import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolioController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All portfolio endpoints require authentication
router.use(requireAuth);

router.get('/', PortfolioController.getPortfolio);
router.get('/summary', PortfolioController.getPortfolioSummary);
router.get('/:id', PortfolioController.getPropertyDetails);
router.post('/', PortfolioController.addProperty);
router.patch('/:id', PortfolioController.updateProperty);
router.delete('/:id', PortfolioController.removeProperty);

export default router;
