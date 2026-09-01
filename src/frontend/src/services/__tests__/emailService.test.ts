import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApi, resetApiMocks } from '../../test/mocks/api';
import { mockEmailSchedule } from '../../test/fixtures/data';

vi.mock('../../lib/api', async () => {
  const { mockApi } = await import('../../test/mocks/api');
  return { api: mockApi };
});

import { emailService } from '../emailService';

describe('emailService', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  describe('createSchedule', () => {
    it('should create email schedule with POST request', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        schedule: mockEmailSchedule,
      });

      const data = {
        portfolio_id: 'portfolio_1',
        frequency: 'weekly' as const,
        day_of_week: 'monday',
        time_of_day: '09:00',
        report_type: 'summary' as const,
        recipients: ['user@example.com'],
      };

      const result = await emailService.createSchedule(data);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/email/schedules',
        expect.objectContaining(data)
      );
      expect(result.success).toBe(true);
      expect(result.schedule.id).toBe('schedule_1');
    });

    it('should support optional template_id', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        schedule: { ...mockEmailSchedule, template_id: 'template_1' },
      });

      await emailService.createSchedule({
        portfolio_id: 'portfolio_1',
        frequency: 'monthly',
        day_of_month: 15,
        time_of_day: '10:00',
        report_type: 'full',
        recipients: ['user@example.com'],
        template_id: 'template_1',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/email/schedules',
        expect.objectContaining({
          template_id: 'template_1',
        })
      );
    });

    it('should throw on API error', async () => {
      mockApi.post.mockRejectedValue(new Error('Creation failed'));

      await expect(
        emailService.createSchedule({
          portfolio_id: 'portfolio_1',
          frequency: 'weekly',
          time_of_day: '09:00',
          report_type: 'summary',
          recipients: ['user@example.com'],
        })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('getSchedules', () => {
    it('should fetch all email schedules', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        schedules: [mockEmailSchedule],
        count: 1,
      });

      const result = await emailService.getSchedules();

      expect(mockApi.get).toHaveBeenCalledWith('/api/email/schedules');
      expect(result.success).toBe(true);
      expect(result.schedules).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should return empty list when no schedules exist', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        schedules: [],
        count: 0,
      });

      const result = await emailService.getSchedules();

      expect(result.schedules).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('getSchedule', () => {
    it('should fetch single schedule by ID', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        schedule: mockEmailSchedule,
      });

      const result = await emailService.getSchedule('schedule_1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/email/schedules/schedule_1');
      expect(result.success).toBe(true);
      expect(result.schedule.id).toBe('schedule_1');
      expect(result.schedule.frequency).toBe('weekly');
    });

    it('should throw on not found', async () => {
      mockApi.get.mockRejectedValue(new Error('Schedule not found'));

      await expect(emailService.getSchedule('invalid_id')).rejects.toThrow(
        'Schedule not found'
      );
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule with PATCH request', async () => {
      const updatedSchedule = { ...mockEmailSchedule, frequency: 'monthly' as const };
      mockApi.patch.mockResolvedValue({
        success: true,
        schedule: updatedSchedule,
      });

      const updateData = {
        frequency: 'monthly' as const,
        day_of_month: 15,
      };

      const result = await emailService.updateSchedule('schedule_1', updateData);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/email/schedules/schedule_1',
        expect.objectContaining(updateData)
      );
      expect(result.schedule.frequency).toBe('monthly');
    });

    it('should support partial updates', async () => {
      mockApi.patch.mockResolvedValue({
        success: true,
        schedule: { ...mockEmailSchedule, is_active: false },
      });

      await emailService.updateSchedule('schedule_1', {
        is_active: false,
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/email/schedules/schedule_1',
        { is_active: false }
      );
    });

    it('should update recipients', async () => {
      const newRecipients = ['user@example.com', 'admin@example.com'];
      mockApi.patch.mockResolvedValue({
        success: true,
        schedule: { ...mockEmailSchedule, recipients: newRecipients },
      });

      const result = await emailService.updateSchedule('schedule_1', {
        recipients: newRecipients,
      });

      expect(result.schedule.recipients).toEqual(newRecipients);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete schedule with DELETE request', async () => {
      mockApi.delete.mockResolvedValue({
        success: true,
        message: 'Schedule deleted',
      });

      const result = await emailService.deleteSchedule('schedule_1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/email/schedules/schedule_1');
      expect(result.success).toBe(true);
    });

    it('should throw on deletion error', async () => {
      mockApi.delete.mockRejectedValue(new Error('Deletion failed'));

      await expect(emailService.deleteSchedule('invalid_id')).rejects.toThrow(
        'Deletion failed'
      );
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email with correct parameters', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        message: 'Test email sent',
        messageId: 'msg_12345',
      });

      const data = {
        portfolio_id: 'portfolio_1',
        recipient_email: 'test@example.com',
        report_type: 'summary' as const,
      };

      const result = await emailService.sendTestEmail(data);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/email/test-send',
        expect.objectContaining(data)
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_12345');
    });

    it('should support different report types', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        message: 'Test email sent',
      });

      for (const type of ['summary', 'full', 'executive'] as const) {
        await emailService.sendTestEmail({
          portfolio_id: 'portfolio_1',
          recipient_email: 'test@example.com',
          report_type: type,
        });

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/email/test-send',
          expect.objectContaining({ report_type: type })
        );
      }
    });

    it('should throw on send failure', async () => {
      mockApi.post.mockRejectedValue(new Error('Failed to send'));

      await expect(
        emailService.sendTestEmail({
          portfolio_id: 'portfolio_1',
          recipient_email: 'test@example.com',
          report_type: 'summary',
        })
      ).rejects.toThrow('Failed to send');
    });
  });

  describe('getDeliveryLogs', () => {
    it('should fetch delivery logs with default limit', async () => {
      const mockLogs = [
        {
          id: 'log_1',
          recipient_email: 'user@example.com',
          status: 'sent' as const,
          attempt_count: 1,
          created_at: new Date(),
        },
      ];
      mockApi.get.mockResolvedValue({
        success: true,
        logs: mockLogs,
        count: 1,
      });

      const result = await emailService.getDeliveryLogs();

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/email/delivery-logs')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      );
      expect(result.logs).toHaveLength(1);
    });

    it('should fetch logs for specific schedule', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        logs: [],
        count: 0,
      });

      await emailService.getDeliveryLogs('schedule_1', 25);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('schedule_id=schedule_1')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=25')
      );
    });

    it('should support custom limit', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        logs: [],
        count: 0,
      });

      await emailService.getDeliveryLogs(undefined, 100);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=100')
      );
    });
  });

  describe('getQueueStatus', () => {
    it('should fetch queue status', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        queue_status: {
          active: 2,
          delayed: 1,
          failed: 0,
          completed: 150,
          waiting: 5,
        },
      });

      const result = await emailService.getQueueStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/api/email/queue-status');
      expect(result.queue_status.active).toBe(2);
      expect(result.queue_status.completed).toBe(150);
    });
  });

  describe('verifyConnection', () => {
    it('should verify email service connection', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        email_service: 'connected',
      });

      const result = await emailService.verifyConnection();

      expect(mockApi.get).toHaveBeenCalledWith('/api/email/verify-connection');
      expect(result.email_service).toBe('connected');
    });

    it('should report disconnected status', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        email_service: 'disconnected',
      });

      const result = await emailService.verifyConnection();

      expect(result.email_service).toBe('disconnected');
    });

    it('should throw on verification error', async () => {
      mockApi.get.mockRejectedValue(new Error('Connection check failed'));

      await expect(emailService.verifyConnection()).rejects.toThrow(
        'Connection check failed'
      );
    });
  });
});
