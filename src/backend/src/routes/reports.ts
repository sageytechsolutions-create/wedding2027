import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { verifyAuth } from '../middleware/auth';

export const reportRoutes = Router();

reportRoutes.use(verifyAuth);

// Report generation and management
reportRoutes.post('/generate', (req, res) => reportController.generateReport(req, res));
reportRoutes.get('/history', (req, res) => reportController.getReportHistory(req, res));
reportRoutes.get('/:id/download', (req, res) => reportController.downloadReport(req, res));
reportRoutes.delete('/:id', (req, res) => reportController.deleteReport(req, res));

// Cache management
reportRoutes.get('/cache/status', (req, res) => reportController.getCacheStatus(req, res));
reportRoutes.delete('/cache/clear', (req, res) => reportController.clearCache(req, res));

// Portfolio data and analytics
reportRoutes.get('/portfolio/:portfolio_id/snapshot', (req, res) => reportController.getPortfolioSnapshot(req, res));
reportRoutes.get('/portfolio/:portfolio_id/health', (req, res) => reportController.getPortfolioHealth(req, res));
reportRoutes.get('/portfolio/:portfolio_id/trends', (req, res) => reportController.getPortfolioTrends(req, res));
reportRoutes.get('/portfolio/:portfolio_id/aggregations', (req, res) => reportController.getAggregations(req, res));

export default reportRoutes;
