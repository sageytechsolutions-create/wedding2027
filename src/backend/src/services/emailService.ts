import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

export const EmailScheduleConfigSchema = z.object({
  portfolioId: z.string().uuid(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'once']),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  dayOfMonth: z.number().min(1).max(28).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  reportType: z.enum(['summary', 'full', 'executive']),
  recipients: z.array(z.string().email()),
  templateId: z.string().uuid().optional(),
});

export interface EmailScheduleConfig extends z.infer<typeof EmailScheduleConfigSchema> {
  userId?: string;
}

export interface EmailSchedule {
  id: string;
  portfolioId: string;
  userId: string;
  frequency: string;
  dayOfWeek?: string;
  dayOfMonth?: number;
  timeOfDay: string;
  reportType: string;
  recipients: string[];
  templateId?: string;
  lastRun?: Date;
  nextRun: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailService {
  async createSchedule(userId: string, config: EmailScheduleConfig): Promise<EmailSchedule> {
    try {
      EmailScheduleConfigSchema.parse(config);
    } catch (error) {
      throw new Error(`Invalid email schedule configuration: ${error}`);
    }

    const nextRun = this.calculateNextRun(
      config.frequency,
      config.dayOfWeek,
      config.dayOfMonth,
      config.timeOfDay
    );

    const schedule = await prisma.emailSchedule.create({
      data: {
        id: randomUUID(),
        portfolioId: config.portfolioId,
        userId: userId,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        timeOfDay: config.timeOfDay,
        reportType: config.reportType,
        recipients: config.recipients,
        templateId: config.templateId,
        nextRun: nextRun,
        isActive: true,
      },
    });

    return this.mapToEmailSchedule(schedule);
  }

  async getSchedules(userId: string, portfolioId?: string): Promise<EmailSchedule[]> {
    const schedules = await prisma.emailSchedule.findMany({
      where: {
        userId: userId,
        ...(portfolioId && { portfolioId: portfolioId }),
      },
      orderBy: { nextRun: 'asc' },
    });

    return schedules.map((s) => this.mapToEmailSchedule(s));
  }

  async getScheduleById(scheduleId: string): Promise<EmailSchedule | null> {
    const schedule = await prisma.emailSchedule.findUnique({
      where: { id: scheduleId },
    });

    return schedule ? this.mapToEmailSchedule(schedule) : null;
  }

  async updateSchedule(scheduleId: string, updates: Partial<EmailScheduleConfig>): Promise<EmailSchedule> {
    const existing = await this.getScheduleById(scheduleId);
    if (!existing) {
      throw new Error('Schedule not found');
    }

    const merged = { ...existing, ...updates };
    const nextRun = this.calculateNextRun(
      merged.frequency as string,
      merged.dayOfWeek,
      merged.dayOfMonth,
      merged.timeOfDay
    );

    const schedule = await prisma.emailSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(updates.frequency && { frequency: updates.frequency }),
        ...(updates.dayOfWeek !== undefined && { dayOfWeek: updates.dayOfWeek }),
        ...(updates.dayOfMonth !== undefined && { dayOfMonth: updates.dayOfMonth }),
        ...(updates.timeOfDay && { timeOfDay: updates.timeOfDay }),
        ...(updates.reportType && { reportType: updates.reportType }),
        ...(updates.recipients && { recipients: updates.recipients }),
        nextRun: nextRun,
        updatedAt: new Date(),
      },
    });

    return this.mapToEmailSchedule(schedule);
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await prisma.emailSchedule.delete({
      where: { id: scheduleId },
    });
  }

  async deactivateSchedule(scheduleId: string): Promise<void> {
    await prisma.emailSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
  }

  async getSchedulesForDelivery(): Promise<EmailSchedule[]> {
    const now = new Date();

    const schedules = await prisma.emailSchedule.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now,
        },
      },
    });

    return schedules.map((s) => this.mapToEmailSchedule(s));
  }

  async updateLastRunAndNextRun(scheduleId: string, success: boolean): Promise<void> {
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    let nextRun = schedule.nextRun;
    if (success) {
      nextRun = this.calculateNextRun(
        schedule.frequency,
        schedule.dayOfWeek,
        schedule.dayOfMonth,
        schedule.timeOfDay
      );
    }

    await prisma.emailSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRun: new Date(),
        nextRun: nextRun,
        updatedAt: new Date(),
      },
    });
  }

  private calculateNextRun(
    frequency: string,
    dayOfWeek?: string,
    dayOfMonth?: number,
    time?: string
  ): Date {
    const [hours, minutes] = (time || '09:00').split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'weekly': {
        const dayMap: { [key: string]: number } = {
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
          sunday: 0,
        };

        const targetDay = dayMap[dayOfWeek || 'monday'];
        let daysUntilTarget = (targetDay - next.getDay() + 7) % 7;
        if (daysUntilTarget === 0 && next.getTime() < Date.now()) {
          daysUntilTarget = 7;
        }
        next.setDate(next.getDate() + daysUntilTarget);
        break;
      }

      case 'monthly': {
        next.setDate(dayOfMonth || 1);
        if (next.getTime() <= now.getTime()) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
      }

      case 'quarterly': {
        next.setDate(dayOfMonth || 1);
        let quartile = Math.floor(now.getMonth() / 3);
        next.setMonth((quartile + 1) * 3);
        if (next.getTime() <= now.getTime()) {
          quartile++;
          next.setMonth((quartile + 1) * 3);
        }
        break;
      }

      case 'once':
      default: {
        if (next.getTime() <= now.getTime()) {
          next.setDate(next.getDate() + 1);
        }
        break;
      }
    }

    return next;
  }

  private mapToEmailSchedule(record: any): EmailSchedule {
    return {
      id: record.id,
      portfolioId: record.portfolioId,
      userId: record.userId,
      frequency: record.frequency,
      dayOfWeek: record.dayOfWeek,
      dayOfMonth: record.dayOfMonth,
      timeOfDay: record.timeOfDay,
      reportType: record.reportType,
      recipients: record.recipients,
      templateId: record.templateId,
      lastRun: record.lastRun,
      nextRun: record.nextRun,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export const emailService = new EmailService();
