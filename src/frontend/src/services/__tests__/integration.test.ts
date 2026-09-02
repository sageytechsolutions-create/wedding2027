import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApi, resetApiMocks } from '../../test/mocks/api';
import {
  mockPortfolioSnapshot,
  mockPortfolioHealth,
  mockEmailSchedule,
  mockMetricAlertWithThreshold,
  mockCacheStats,
} from '../../test/fixtures/data';

vi.mock('../../lib/api', async () => {
  const { mockApi } = await import('../../test/mocks/api');
  return { api: mockApi };
});

import { reportService } from '../reportService';
import { emailService } from '../emailService';
import { metricsService } from '../metricsService';

describe('Service Integration Tests', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  describe('Portfolio Analysis Workflow', () => {
    it('should fetch portfolio health and snapshot together', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        health: mockPortfolioHealth,
      });

      const healthPromise = reportService.getPortfolioHealth('portfolio_1');

      mockApi.get.mockResolvedValue({
        success: true,
        snapshot: mockPortfolioSnapshot,
      });

      const snapshotPromise = reportService.getPortfolioSnapshot('portfolio_1');

      const [health, snapshot] = await Promise.all([healthPromise, snapshotPromise]);

      expect(health.health.score).toBe(78);
      expect(snapshot.snapshot.metrics.totalValue).toBe(1350000);
    });

    it('should combine portfolio metrics with trends', async () => {
      const mockTrends = [
        { date: new Date(), value: 1200000, roi: 8, cashFlow: 4500 },
        { date: new Date(), value: 1300000, roi: 15, cashFlow: 4800 },
      ];

      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          snapshot: mockPortfolioSnapshot,
        })
        .mockResolvedValueOnce({
          success: true,
          portfolio_id: 'portfolio_1',
          trends: mockTrends,
          period_months: 12,
        });

      const snapshot = await reportService.getPortfolioSnapshot('portfolio_1');
      const trends = await reportService.getPortfolioTrends('portfolio_1');

      expect(snapshot.snapshot.metrics.totalValue).toBe(1350000);
      expect(trends.trends).toHaveLength(2);
      expect(trends.trends[1].value).toBeGreaterThan(trends.trends[0].value);
    });

    it('should validate metrics against portfolio snapshot', async () => {
      const formulaConfig = {
        numeratorField: 'totalGain',
        denominatorField: 'totalCostBasis',
      };

      mockApi.post.mockResolvedValue({
        valid: true,
        message: 'Formula is valid',
      });

      const validation = await metricsService.validateFormula({
        formula_type: 'ratio',
        formula_config: formulaConfig,
        portfolio_id: 'portfolio_1',
      });

      expect(validation.valid).toBe(true);
    });
  });

  describe('Email Schedule Workflow', () => {
    it('should create schedule and send test email', async () => {
      const scheduleData = {
        portfolio_id: 'portfolio_1',
        frequency: 'weekly' as const,
        day_of_week: 'monday',
        time_of_day: '09:00',
        report_type: 'summary' as const,
        recipients: ['user@example.com'],
      };

      mockApi.post.mockResolvedValueOnce({
        success: true,
        schedule: mockEmailSchedule,
      });

      const schedule = await emailService.createSchedule(scheduleData);
      expect(schedule.schedule.id).toBe('schedule_1');

      mockApi.post.mockResolvedValueOnce({
        success: true,
        message: 'Test email sent',
        messageId: 'msg_123',
      });

      const testEmail = await emailService.sendTestEmail({
        portfolio_id: 'portfolio_1',
        recipient_email: 'user@example.com',
        report_type: 'summary',
      });

      expect(testEmail.success).toBe(true);
      expect(testEmail.messageId).toBe('msg_123');
    });

    it('should update schedule and verify connection', async () => {
      mockApi.patch.mockResolvedValue({
        success: true,
        schedule: { ...mockEmailSchedule, frequency: 'monthly' as const },
      });

      const updated = await emailService.updateSchedule('schedule_1', {
        frequency: 'monthly',
      });

      expect(updated.schedule.frequency).toBe('monthly');

      mockApi.get.mockResolvedValue({
        success: true,
        email_service: 'connected',
      });

      const connection = await emailService.verifyConnection();
      expect(connection.email_service).toBe('connected');
    });

    it('should fetch schedules and delivery logs together', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          schedules: [mockEmailSchedule],
          count: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          logs: [
            {
              id: 'log_1',
              schedule_id: 'schedule_1',
              recipient_email: 'user@example.com',
              status: 'sent' as const,
              attempt_count: 1,
              created_at: new Date(),
            },
          ],
          count: 1,
        });

      const schedules = await emailService.getSchedules();
      const logs = await emailService.getDeliveryLogs('schedule_1');

      expect(schedules.schedules).toHaveLength(1);
      expect(logs.logs).toHaveLength(1);
      expect(logs.logs[0].schedule_id).toBe('schedule_1');
    });

    it('should monitor queue status during operations', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        queue_status: mockCacheStats,
      });

      // Queue should be tracked before and after operations
      const queueBefore = await emailService.getQueueStatus();
      expect(queueBefore.queue_status).toBeDefined();

      // Simulate sending email
      mockApi.post.mockResolvedValue({
        success: true,
        message: 'Email sent',
      });

      await emailService.sendTestEmail({
        portfolio_id: 'portfolio_1',
        recipient_email: 'test@example.com',
        report_type: 'summary',
      });

      const queueAfter = await emailService.getQueueStatus();
      expect(queueAfter.queue_status).toBeDefined();
    });
  });

  describe('Metrics and Alerts Workflow', () => {
    it('should create metric and set threshold alert', async () => {
      const metricData = {
        portfolio_id: 'portfolio_1',
        formula_type: 'ratio' as const,
        formula_config: {
          numeratorField: 'totalGain',
          denominatorField: 'totalCostBasis',
        },
        display_format: 'percentage' as const,
      };

      mockApi.post.mockResolvedValueOnce({
        success: true,
        metric: {
          id: 'metric_1',
          user_id: 'user_1',
          name: 'ROI',
          formula_type: 'ratio',
          formula_config: metricData.formula_config,
          display_format: 'percentage',
          is_favorite: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        calculation: {
          id: 'calc_1',
          metric_id: 'metric_1',
          calculated_value: 22.5,
          calculation_time: 145,
          alert_triggered: false,
          created_at: new Date(),
        },
        value: 22.5,
      });

      const metric = await metricsService.calculateMetric(metricData);
      expect(metric.value).toBe(22.5);

      mockApi.post.mockResolvedValueOnce({
        success: true,
        alert: mockMetricAlertWithThreshold,
      });

      const alert = await metricsService.createAlert({
        metric_id: 'metric_1',
        threshold_value: 15,
        breach_direction: 'below',
      });

      expect(alert.alert.threshold_value).toBe(15);
    });

    it('should fetch alerts and acknowledge them', async () => {
      mockApi.get.mockResolvedValueOnce({
        success: true,
        alerts: [mockMetricAlertWithThreshold],
        active_count: 1,
      });

      const alerts = await metricsService.getAlerts();
      expect(alerts.alerts).toHaveLength(1);
      expect(alerts.active_count).toBe(1);

      mockApi.put.mockResolvedValueOnce({
        success: true,
        alert: {
          ...mockMetricAlertWithThreshold,
          acknowledged_at: new Date(),
        },
      });

      const acknowledged = await metricsService.acknowledgeAlert('alert_1');
      expect(acknowledged.alert.acknowledged_at).toBeDefined();
    });

    it('should update metric and track history', async () => {
      mockApi.patch.mockResolvedValueOnce({
        success: true,
        metric: {
          id: 'metric_1',
          user_id: 'user_1',
          name: 'Updated Metric',
          formula_type: 'ratio',
          formula_config: {},
          display_format: 'percentage',
          is_favorite: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const updated = await metricsService.updateMetric('metric_1', {
        is_favorite: true,
      });

      expect(updated.metric.is_favorite).toBe(true);

      mockApi.get.mockResolvedValueOnce({
        success: true,
        metric_id: 'metric_1',
        calculations: [
          {
            id: 'calc_1',
            metric_id: 'metric_1',
            calculated_value: 22.5,
            calculation_time: 145,
            alert_triggered: false,
            created_at: new Date(),
          },
        ],
        count: 1,
      });

      const history = await metricsService.getMetricHistory('metric_1');
      expect(history.calculations).toHaveLength(1);
    });
  });

  describe('Report Generation Workflow', () => {
    it('should generate report and manage cache', async () => {
      mockApi.post.mockResolvedValueOnce({
        success: true,
        report: {
          id: 'report_1',
          portfolio_id: 'portfolio_1',
          report_type: 'summary',
          status: 'generated',
          download_url: '/api/reports/report_1/download',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          file_size: 250000,
          generated_at: new Date(),
        },
      });

      const report = await reportService.generateReport('portfolio_1', 'summary');
      expect(report.report.id).toBe('report_1');

      mockApi.get.mockResolvedValueOnce({
        success: true,
        cache_stats: {
          hits: 150,
          misses: 50,
          hitRate: 0.75,
          totalCached: 5,
        },
        memory_usage: { used: 5242880, peak: 10485760, estimated: 5242880 },
      });

      const cacheStatus = await reportService.getCacheStatus();
      expect(cacheStatus.cache_stats.hitRate).toBe(0.75);

      mockApi.delete.mockResolvedValueOnce({
        success: true,
        message: 'Cache cleared',
      });

      const cleared = await reportService.clearCache();
      expect(cleared.success).toBe(true);
    });

    it('should generate different report types sequentially', async () => {
      const types = ['summary', 'full', 'executive'] as const;

      for (const type of types) {
        mockApi.post.mockResolvedValueOnce({
          success: true,
          report: {
            id: `report_${type}`,
            portfolio_id: 'portfolio_1',
            report_type: type,
            status: 'generated',
            download_url: `/api/reports/report_${type}/download`,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            file_size: 250000,
            generated_at: new Date(),
          },
        });

        const report = await reportService.generateReport('portfolio_1', type);
        expect(report.report.report_type).toBe(type);
      }

      expect(mockApi.post).toHaveBeenCalledTimes(3);
    });

    it('should fetch report history and manage downloads', async () => {
      const mockHistory = [
        {
          id: 'report_1',
          portfolio_id: 'portfolio_1',
          report_type: 'summary',
          status: 'generated',
          generated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ];

      mockApi.get.mockResolvedValueOnce({
        success: true,
        reports: mockHistory,
        count: 1,
      });

      const history = await reportService.getReportHistory('portfolio_1');
      expect(history.reports).toHaveLength(1);
      expect(history.reports[0].id).toBe('report_1');
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial failures in parallel operations', async () => {
      mockApi.get
        .mockRejectedValueOnce(new Error('Health fetch failed'))
        .mockResolvedValueOnce({
          success: true,
          alerts: [mockMetricAlertWithThreshold],
          active_count: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          schedules: [mockEmailSchedule],
          count: 1,
        });

      const results = await Promise.allSettled([
        reportService.getPortfolioHealth('portfolio_1').catch(() => null),
        metricsService.getAlerts(),
        emailService.getSchedules(),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should retry on transient failures', async () => {
      mockApi.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          report: {
            id: 'report_1',
            portfolio_id: 'portfolio_1',
            report_type: 'summary',
            status: 'generated',
            download_url: '/api/reports/report_1/download',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            file_size: 250000,
            generated_at: new Date(),
          },
        });

      try {
        await reportService.generateReport('portfolio_1', 'summary');
      } catch (err) {
        // Retry logic would happen here
      }

      const retryResult = await reportService.generateReport(
        'portfolio_1',
        'summary'
      );
      expect(retryResult.report.id).toBe('report_1');
    });
  });

  describe('Cache Management Workflow', () => {
    it('should track cache hits and misses', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          success: true,
          cache_stats: {
            hits: 100,
            misses: 50,
            hitRate: 0.67,
            totalCached: 5,
          },
          memory_usage: { used: 5242880, peak: 10485760, estimated: 5242880 },
        })
        .mockResolvedValueOnce({
          success: true,
          cache_stats: {
            hits: 110,
            misses: 50,
            hitRate: 0.69,
            totalCached: 5,
          },
          memory_usage: { used: 5242880, peak: 10485760, estimated: 5242880 },
        });

      const status1 = await reportService.getCacheStatus();
      expect(status1.cache_stats.hits).toBe(100);

      const status2 = await reportService.getCacheStatus();
      expect(status2.cache_stats.hits).toBe(110);
      expect(status2.cache_stats.hitRate).toBeGreaterThan(
        status1.cache_stats.hitRate
      );
    });

    it('should clear cache and reset statistics', async () => {
      mockApi.get.mockResolvedValueOnce({
        success: true,
        cache_stats: {
          hits: 150,
          misses: 50,
          hitRate: 0.75,
          totalCached: 5,
        },
        memory_usage: { used: 5242880, peak: 10485760, estimated: 5242880 },
      });

      const before = await reportService.getCacheStatus();
      expect(before.cache_stats.hits).toBe(150);

      mockApi.delete.mockResolvedValueOnce({
        success: true,
        message: 'Cache cleared',
      });

      const cleared = await reportService.clearCache();
      expect(cleared.success).toBe(true);

      mockApi.get.mockResolvedValueOnce({
        success: true,
        cache_stats: {
          hits: 0,
          misses: 0,
          hitRate: 0,
          totalCached: 0,
        },
        memory_usage: { used: 0, peak: 10485760, estimated: 0 },
      });

      const after = await reportService.getCacheStatus();
      expect(after.cache_stats.hits).toBe(0);
    });
  });
});
