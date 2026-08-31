import { api } from '../lib/api';

export interface EmailSchedule {
  id: string;
  portfolio_id: string;
  user_id: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'once';
  day_of_week?: string;
  day_of_month?: number;
  time_of_day: string;
  report_type: 'summary' | 'full' | 'executive';
  recipients: string[];
  template_id?: string;
  last_run?: Date;
  next_run: Date;
  is_active: boolean;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmailDeliveryLog {
  id: string;
  schedule_id?: string;
  message_id?: string;
  recipient_email: string;
  subject?: string;
  status: 'sent' | 'failed' | 'bounced' | 'opened';
  error_message?: string;
  sent_at?: Date;
  opened_at?: Date;
  attempt_count: number;
  created_at: Date;
}

export interface QueueStatus {
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  waiting: number;
}

export const emailService = {
  async createSchedule(data: {
    portfolio_id: string;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'once';
    day_of_week?: string;
    day_of_month?: number;
    time_of_day: string;
    report_type: 'summary' | 'full' | 'executive';
    recipients: string[];
    template_id?: string;
  }): Promise<{
    success: boolean;
    schedule: EmailSchedule;
  }> {
    return api.post('/api/email/schedules', data);
  },

  async getSchedules(): Promise<{
    success: boolean;
    schedules: EmailSchedule[];
    count: number;
  }> {
    return api.get('/api/email/schedules');
  },

  async getSchedule(scheduleId: string): Promise<{
    success: boolean;
    schedule: EmailSchedule;
  }> {
    return api.get(`/api/email/schedules/${scheduleId}`);
  },

  async updateSchedule(
    scheduleId: string,
    data: Partial<{
      frequency: 'weekly' | 'monthly' | 'quarterly' | 'once';
      day_of_week?: string;
      day_of_month?: number;
      time_of_day: string;
      report_type: 'summary' | 'full' | 'executive';
      recipients: string[];
      is_active: boolean;
    }>
  ): Promise<{
    success: boolean;
    schedule: EmailSchedule;
  }> {
    return api.patch(`/api/email/schedules/${scheduleId}`, data);
  },

  async deleteSchedule(scheduleId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return api.delete(`/api/email/schedules/${scheduleId}`);
  },

  async sendTestEmail(data: {
    portfolio_id: string;
    recipient_email: string;
    report_type: 'summary' | 'full' | 'executive';
  }): Promise<{
    success: boolean;
    message: string;
    messageId?: string;
  }> {
    return api.post('/api/email/test-send', data);
  },

  async getDeliveryLogs(
    scheduleId?: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    logs: EmailDeliveryLog[];
    count: number;
  }> {
    const params = new URLSearchParams();
    if (scheduleId) params.append('schedule_id', scheduleId);
    params.append('limit', limit.toString());

    return api.get(
      `/api/email/delivery-logs?${params.toString()}`
    );
  },

  async getQueueStatus(): Promise<{
    success: boolean;
    queue_status: QueueStatus;
  }> {
    return api.get('/api/email/queue-status');
  },

  async verifyConnection(): Promise<{
    success: boolean;
    email_service: 'connected' | 'disconnected';
  }> {
    return api.get('/api/email/verify-connection');
  },
};
