import Queue from 'bull';
import { emailService, EmailSchedule } from './emailService';
import { emailDeliveryService } from './emailDeliveryService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisUrl = `redis://${process.env.REDIS_HOST || 'localhost'}:${parseInt(process.env.REDIS_PORT || '6379')}`;

export interface EmailQueueJob {
  scheduleId: string;
  portfolioId: string;
  userId: string;
  recipients: string[];
  reportType: string;
  portfolioName: string;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export class EmailQueueService {
  private emailQueue: Queue.Queue<EmailQueueJob>;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.emailQueue = new Queue('email-delivery', redisUrl);
    this.setupQueueHandlers();
  }

  private setupQueueHandlers(): void {
    this.emailQueue.on('completed', async (job) => {
      console.log(`Email job ${job.id} completed`);
      await emailService.updateLastRunAndNextRun(job.data.scheduleId, true);
      job.remove();
    });

    this.emailQueue.on('failed', async (job, err) => {
      console.error(`Email job ${job.id} failed:`, err.message);
      if (job.attemptsMade < 3) {
        await job.retry();
      } else {
        await emailService.updateLastRunAndNextRun(job.data.scheduleId, false);
      }
    });
  }

  async queueReportEmail(schedule: EmailSchedule, reportBuffer?: Buffer): Promise<string> {
    const job = await this.emailQueue.add(
      {
        scheduleId: schedule.id,
        portfolioId: schedule.portfolioId,
        userId: schedule.userId,
        recipients: schedule.recipients,
        reportType: schedule.reportType,
        portfolioName: 'Portfolio', // TODO: fetch actual portfolio name
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
        timeout: 30000,
      }
    );

    return job.id?.toString() || '';
  }

  async processEmailQueue(): Promise<void> {
    this.emailQueue.process(async (job) => {
      const data = job.data as EmailQueueJob;

      try {
        // TODO: Generate report from Sprint 4 reportGenerationService
        const mockReportBuffer = Buffer.from('Mock PDF Report');

        const results = await emailDeliveryService.sendScheduledReport(
          data.scheduleId,
          data.recipients,
          data.reportType,
          mockReportBuffer,
          data.portfolioName
        );

        const allSucceeded = results.every((r) => r.status === 'sent');
        if (!allSucceeded) {
          throw new Error('Some emails failed to send');
        }

        return { success: true, results };
      } catch (error) {
        throw error;
      }
    });
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const counts = await this.emailQueue.getJobCounts();

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  async getScheduledJobs(): Promise<Array<Queue.Job<EmailQueueJob>>> {
    const jobs = await this.emailQueue.getJobs(['waiting', 'active', 'delayed']);
    return jobs;
  }

  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.emailQueue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  async clearFailedJobs(): Promise<number> {
    const failedJobs = await this.emailQueue.getFailed();
    for (const job of failedJobs) {
      await job.remove();
    }
    return failedJobs.length;
  }

  async startScheduleProcessor(): Promise<void> {
    if (this.processingInterval) {
      return;
    }

    console.log('Starting email schedule processor...');

    this.processingInterval = setInterval(async () => {
      try {
        const schedulesToRun = await emailService.getSchedulesForDelivery();

        for (const schedule of schedulesToRun) {
          await this.queueReportEmail(schedule);
          console.log(`Queued email for schedule ${schedule.id}`);
        }
      } catch (error) {
        console.error('Error processing schedules:', error);
      }
    }, 60000); // Check every minute
  }

  async stopScheduleProcessor(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Email schedule processor stopped');
    }
  }

  async cleanupOldLogs(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const result = await prisma.emailDeliveryLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up delivery logs:', error);
      return 0;
    }
  }

  async close(): Promise<void> {
    await this.stopScheduleProcessor();
    await this.emailQueue.close();
  }
}

export const emailQueueService = new EmailQueueService();
