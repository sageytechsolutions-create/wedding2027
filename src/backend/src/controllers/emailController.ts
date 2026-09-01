import { Request, Response } from 'express';
import { emailService, EmailScheduleConfigSchema } from '../services/emailService';
import { emailDeliveryService } from '../services/emailDeliveryService';
import { emailQueueService } from '../services/emailQueueService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export class EmailController {
  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validated = EmailScheduleConfigSchema.parse(req.body);
      const schedule = await emailService.createSchedule(req.user.id, validated);

      res.status(201).json({ success: true, schedule });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create schedule';
      res.status(400).json({ error: message });
    }
  }

  async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id } = req.query;
      const schedules = await emailService.getSchedules(req.user.id, portfolio_id as string | undefined);

      res.json({ success: true, schedules, count: schedules.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list schedules' });
    }
  }

  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const schedule = await emailService.getScheduleById(id);

      if (!schedule || schedule.user_id !== req.user.id) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ success: true, schedule });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get schedule' });
    }
  }

  async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const existing = await emailService.getScheduleById(id);

      if (!existing || existing.user_id !== req.user.id) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      const updates = EmailScheduleConfigSchema.partial().parse(req.body);
      const schedule = await emailService.updateSchedule(id, updates);

      res.json({ success: true, schedule });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update schedule';
      res.status(400).json({ error: message });
    }
  }

  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const existing = await emailService.getScheduleById(id);

      if (!existing || existing.user_id !== req.user.id) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      await emailService.deleteSchedule(id);
      res.json({ success: true, message: 'Schedule deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  }

  async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id, recipient_email, report_type = 'summary' } = req.body;

      if (!portfolio_id || !recipient_email || !recipient_email.includes('@')) {
        res.status(400).json({ error: 'portfolio_id and valid recipient_email required' });
        return;
      }

      if (!['summary', 'full', 'executive'].includes(report_type)) {
        res.status(400).json({ error: 'Invalid report_type' });
        return;
      }

      const result = await emailDeliveryService.sendTestEmail(recipient_email, `${report_type}-report`);

      res.json({
        success: result.status === 'sent',
        messageId: result.messageId,
        status: result.status,
        error: result.error,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test email';
      res.status(500).json({ error: message });
    }
  }

  async getDeliveryLogs(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { schedule_id, days = 30, limit = 100 } = req.query;
      const daysNum = parseInt(days as string) || 30;
      const limitNum = Math.min(parseInt(limit as string) || 100, 1000);

      const since = new Date();
      since.setDate(since.getDate() - daysNum);

      const where: any = {
        created_at: { gte: since },
      };

      if (schedule_id) {
        where.schedule_id = schedule_id;
      }

      const logs = await prisma.emailDeliveryLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limitNum,
      });

      // Group by status
      const byStatus = logs.reduce(
        (acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      res.json({
        success: true,
        logs,
        summary: {
          total: logs.length,
          by_status: byStatus,
          period_days: daysNum,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get delivery logs' });
    }
  }

  async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const status = await emailQueueService.getQueueStatus();
      res.json({ success: true, queue_status: status });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get queue status' });
    }
  }

  async verifyConnection(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const connected = await emailDeliveryService.verifyConnection();
      res.json({
        success: true,
        email_service: connected ? 'connected' : 'disconnected',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify email connection' });
    }
  }
}

export const emailController = new EmailController();
