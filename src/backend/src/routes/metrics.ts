import { Router } from 'express';
import { metricsController } from '../controllers/metricsController';
import { verifyAuth } from '../middleware/auth';

export const metricsRoutes = Router();

metricsRoutes.use(verifyAuth);

// Metrics operations
metricsRoutes.get('/available', (req, res) => metricsController.getAvailableMetrics(req, res));
metricsRoutes.post('/calculate', (req, res) => metricsController.calculateMetrics(req, res));
metricsRoutes.post('/validate-formula', (req, res) => metricsController.validateFormula(req, res));
metricsRoutes.get('/history/:metricId', (req, res) => metricsController.getMetricHistory(req, res));

// Alert management
metricsRoutes.post('/alerts', (req, res) => metricsController.createAlert(req, res));
metricsRoutes.get('/alerts', (req, res) => metricsController.getAlerts(req, res));
metricsRoutes.put('/alerts/:alertId/acknowledge', (req, res) => metricsController.acknowledgeAlert(req, res));

export default metricsRoutes;
