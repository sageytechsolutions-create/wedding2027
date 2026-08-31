import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const prisma = new PrismaClient();

export const EmailScheduleConfigSchema = z.object({
  portfolio_id: z.string().uuid(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'once']),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  day_of_month: z.number().min(1).max(28).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  report_type: z.enum(['summary', 'full', 'executive']),
  recipients: z.array(z.string().email()),
  template_id: z.string().uuid().optional(),
});

export interface EmailScheduleConfig extends z.infer<typeof EmailScheduleConfigSchema> {
  user_id?: string;
}

export interface EmailSchedule {
  id: string;
  portfolio_id: string;
  user_id: string;
  frequency: string;
  day_of_week?: string;
  day_of_month?: number;
  time_of_day: string;
  report_type: string;
  recipients: string[];
  template_id?: string;
  last_run?: Date;
  next_run: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
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
      config.day_of_week,
      config.day_of_month,
      config.time
    );

    const schedule = await prisma.emailSchedule.create({
      data: {
        id: randomUUID(),
        portfolio_id: config.portfolio_id,
        user_id: userId,
        frequency: config.frequency,
        day_of_week: config.day_of_week,
        day_of_month: config.day_of_month,
        time_of_day: config.time,
        report_type: config.report_type,
        recipients: config.recipients,
        template_id: config.template_id,
        next_run: nextRun,
        is_active: true,
      },
    });

    return this.mapToEmailSchedule(schedule);
  }

  async getSchedules(userId: string, portfolioId?: string): Promise<EmailSchedule[]> {
    const schedules = await prisma.emailSchedule.findMany({
      where: {
        user_id: userId,
        ...(portfolioId && { portfolio_id: portfolioId }),
      },
      orderBy: { next_run: 'asc' },
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
      merged.day_of_week,
      merged.day_of_month,
      merged.time_of_day
    );

    const schedule = await prisma.emailSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(updates.frequency && { frequency: updates.frequency }),
        ...(updates.day_of_week !== undefined && { day_of_week: updates.day_of_week }),
        ...(updates.day_of_month !== undefined && { day_of_month: updates.day_of_month }),
        ...(updates.time && { time_of_day: updates.time }),
        ...(updates.report_type && { report_type: updates.report_type }),
        ...(updates.recipients && { recipients: updates.recipients }),
        next_run: nextRun,
        updated_at: new Date(),
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
      data: { is_active: false },
    });
  }

  async getSchedulesForDelivery(): Promise<EmailSchedule[]> {
    const now = new Date();

    const schedules = await prisma.emailSchedule.findMany({
      where: {
        is_active: true,
        next_run: {
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

    let nextRun = schedule.next_run;
    if (success) {
      nextRun = this.calculateNextRun(
        schedule.frequency,
        schedule.day_of_week,
        schedule.day_of_month,
        schedule.time_of_day
      );
    }

    await prisma.emailSchedule.update({
      where: { id: scheduleId },
      data: {
        last_run: new Date(),
        next_run: nextRun,
        updated_at: new Date(),
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
      portfolio_id: record.portfolio_id,
      user_id: record.user_id,
      frequency: record.frequency,
      day_of_week: record.day_of_week,
      day_of_month: record.day_of_month,
      time_of_day: record.time_of_day,
      report_type: record.report_type,
      recipients: record.recipients,
      template_id: record.template_id,
      last_run: record.last_run,
      next_run: record.next_run,
      is_active: record.is_active,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}

export const emailService = new EmailService();
