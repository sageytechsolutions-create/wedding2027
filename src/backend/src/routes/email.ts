import { Router } from 'express';
import { emailController } from '../controllers/emailController';
import { verifyAuth } from '../middleware/auth';

export const emailRoutes = Router();

emailRoutes.use(verifyAuth);

// Schedule management
emailRoutes.post('/schedules', (req, res) => emailController.createSchedule(req, res));
emailRoutes.get('/schedules', (req, res) => emailController.listSchedules(req, res));
emailRoutes.get('/schedules/:id', (req, res) => emailController.getSchedule(req, res));
emailRoutes.put('/schedules/:id', (req, res) => emailController.updateSchedule(req, res));
emailRoutes.delete('/schedules/:id', (req, res) => emailController.deleteSchedule(req, res));

// Email operations
emailRoutes.post('/test-send', (req, res) => emailController.sendTestEmail(req, res));
emailRoutes.get('/delivery-logs', (req, res) => emailController.getDeliveryLogs(req, res));

// System status
emailRoutes.get('/queue-status', (req, res) => emailController.getQueueStatus(req, res));
emailRoutes.get('/verify-connection', (req, res) => emailController.verifyConnection(req, res));

export default emailRoutes;
