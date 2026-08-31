import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApi, resetApiMocks } from '../../test/mocks/api';
import {
  mockMetric,
  mockMetricAlert,
  mockCustomMetric,
  mockMetricCalculation,
  mockAvailableMetrics,
  mockValidationResult,
  mockMetricAlertWithThreshold,
} from '../../test/fixtures/data';

vi.mock('../../lib/api', async () => {
  const { mockApi } = await import('../../test/mocks/api');
  return { api: mockApi };
});

import { metricsService } from '../metricsService';

describe('metricsService', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  describe('getAvailableMetrics', () => {
    it('should fetch available metrics', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        metrics: mockAvailableMetrics,
      });

      const result = await metricsService.getAvailableMetrics();

      expect(mockApi.get).toHaveBeenCalledWith('/api/metrics/available');
      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(3);
      expect(result.metrics[0].name).toBe('Debt Service Coverage Ratio');
    });

    it('should include metric categories', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        metrics: mockAvailableMetrics,
      });

      const result = await metricsService.getAvailableMetrics();
      const categories = result.metrics.map((m) => m.category);

      expect(categories).toContain('financial');
      expect(categories).toContain('returns');
      expect(categories).toContain('valuation');
    });
  });

  describe('calculateMetric', () => {
    it('should calculate metric with provided formula', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        metric: mockCustomMetric,
        calculation: mockMetricCalculation,
        value: 22.5,
      });

      const data = {
        portfolio_id: 'portfolio_1',
        name: 'Custom ROI',
        formula_type: 'ratio' as const,
        formula_config: {
          numeratorField: 'totalGain',
          denominatorField: 'totalCostBasis',
        },
        display_format: 'percentage' as const,
      };

      const result = await metricsService.calculateMetric(data);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/metrics/calculate',
        expect.objectContaining(data)
      );
      expect(result.success).toBe(true);
      expect(result.value).toBe(22.5);
      expect(result.metric.name).toBe('Custom ROI');
    });

    it('should support different formula types', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        metric: mockCustomMetric,
        calculation: mockMetricCalculation,
        value: 100000,
      });

      for (const type of ['sum', 'average', 'ratio', 'formula'] as const) {
        await metricsService.calculateMetric({
          portfolio_id: 'portfolio_1',
          formula_type: type,
          formula_config: { field: 'value' },
          display_format: 'number',
        });

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/metrics/calculate',
          expect.objectContaining({ formula_type: type })
        );
      }
    });

    it('should support existing metric calculation', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        metric: mockCustomMetric,
        calculation: mockMetricCalculation,
        value: 22.5,
      });

      await metricsService.calculateMetric({
        metric_id: 'metric_1',
        portfolio_id: 'portfolio_1',
        formula_type: 'ratio',
        formula_config: {},
        display_format: 'percentage',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/metrics/calculate',
        expect.objectContaining({ metric_id: 'metric_1' })
      );
    });

    it('should include calculation time', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        metric: mockCustomMetric,
        calculation: mockMetricCalculation,
        value: 22.5,
      });

      const result = await metricsService.calculateMetric({
        portfolio_id: 'portfolio_1',
        formula_type: 'ratio',
        formula_config: {},
        display_format: 'percentage',
      });

      expect(result.calculation.calculation_time).toBe(145);
    });

    it('should throw on calculation error', async () => {
      mockApi.post.mockRejectedValue(new Error('Calculation failed'));

      await expect(
        metricsService.calculateMetric({
          portfolio_id: 'portfolio_1',
          formula_type: 'ratio',
          formula_config: {},
          display_format: 'percentage',
        })
      ).rejects.toThrow('Calculation failed');
    });
  });

  describe('validateFormula', () => {
    it('should validate formula configuration', async () => {
      mockApi.post.mockResolvedValue(mockValidationResult);

      const data = {
        formula_type: 'ratio' as const,
        formula_config: {
          numeratorField: 'totalGain',
          denominatorField: 'totalCostBasis',
        },
      };

      const result = await metricsService.validateFormula(data);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/metrics/validate-formula',
        expect.objectContaining(data)
      );
      expect(result.valid).toBe(true);
    });

    it('should return error for invalid formula', async () => {
      mockApi.post.mockResolvedValue({
        valid: false,
        error: 'Invalid numerator field',
      });

      const result = await metricsService.validateFormula({
        formula_type: 'ratio',
        formula_config: { invalidField: 'test' },
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid numerator field');
    });

    it('should support portfolio context in validation', async () => {
      mockApi.post.mockResolvedValue(mockValidationResult);

      await metricsService.validateFormula({
        formula_type: 'sum',
        formula_config: { fields: ['value1', 'value2'] },
        portfolio_id: 'portfolio_1',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/metrics/validate-formula',
        expect.objectContaining({ portfolio_id: 'portfolio_1' })
      );
    });
  });

  describe('getMetricHistory', () => {
    it('should fetch metric calculation history', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        metric_id: 'metric_1',
        calculations: [mockMetricCalculation],
        count: 1,
      });

      const result = await metricsService.getMetricHistory('metric_1');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/metrics/history/metric_1')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      );
      expect(result.calculations).toHaveLength(1);
    });

    it('should support custom limit', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        metric_id: 'metric_1',
        calculations: [],
        count: 0,
      });

      await metricsService.getMetricHistory('metric_1', 100);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=100')
      );
    });

    it('should include calculation details', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        metric_id: 'metric_1',
        calculations: [mockMetricCalculation],
        count: 1,
      });

      const result = await metricsService.getMetricHistory('metric_1');
      const calc = result.calculations[0];

      expect(calc.calculated_value).toBe(22.5);
      expect(calc.calculation_time).toBe(145);
      expect(calc.alert_triggered).toBe(false);
    });
  });

  describe('createAlert', () => {
    it('should create metric alert with threshold', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        alert: mockMetricAlertWithThreshold,
      });

      const data = {
        metric_id: 'metric_1',
        threshold_value: 15,
        breach_direction: 'below' as const,
      };

      const result = await metricsService.createAlert(data);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/metrics/alerts',
        expect.objectContaining(data)
      );
      expect(result.alert.threshold_value).toBe(15);
      expect(result.alert.breach_direction).toBe('below');
    });

    it('should support both above and below directions', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        alert: mockMetricAlertWithThreshold,
      });

      for (const direction of ['above', 'below'] as const) {
        await metricsService.createAlert({
          metric_id: 'metric_1',
          threshold_value: 15,
          breach_direction: direction,
        });

        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/metrics/alerts',
          expect.objectContaining({ breach_direction: direction })
        );
      }
    });

    it('should support optional portfolio context', async () => {
      mockApi.post.mockResolvedValue({
        success: true,
        alert: mockMetricAlertWithThreshold,
      });

      await metricsService.createAlert({
        metric_id: 'metric_1',
        portfolio_id: 'portfolio_1',
        threshold_value: 15,
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/metrics/alerts',
        expect.objectContaining({ portfolio_id: 'portfolio_1' })
      );
    });
  });

  describe('getAlerts', () => {
    it('should fetch all metric alerts', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        alerts: [mockMetricAlertWithThreshold],
        active_count: 1,
      });

      const result = await metricsService.getAlerts();

      expect(mockApi.get).toHaveBeenCalledWith('/api/metrics/alerts');
      expect(result.success).toBe(true);
      expect(result.alerts).toHaveLength(1);
      expect(result.active_count).toBe(1);
    });

    it('should distinguish active alerts', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        alerts: [
          mockMetricAlertWithThreshold,
          { ...mockMetricAlertWithThreshold, id: 'alert_2', is_active: false },
        ],
        active_count: 1,
      });

      const result = await metricsService.getAlerts();

      const activeAlerts = result.alerts.filter((a) => a.is_active);
      expect(activeAlerts).toHaveLength(1);
      expect(result.active_count).toBe(1);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert with PUT request', async () => {
      const acknowledgedAlert = {
        ...mockMetricAlertWithThreshold,
        acknowledged_at: new Date(),
      };
      mockApi.put.mockResolvedValue({
        success: true,
        alert: acknowledgedAlert,
      });

      const result = await metricsService.acknowledgeAlert('alert_1');

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/metrics/alerts/alert_1/acknowledge',
        {}
      );
      expect(result.success).toBe(true);
      expect(result.alert.acknowledged_at).toBeDefined();
    });

    it('should throw on acknowledgement error', async () => {
      mockApi.put.mockRejectedValue(new Error('Acknowledgement failed'));

      await expect(metricsService.acknowledgeAlert('alert_1')).rejects.toThrow(
        'Acknowledgement failed'
      );
    });
  });

  describe('updateMetric', () => {
    it('should update metric with PATCH request', async () => {
      mockApi.patch.mockResolvedValue({
        success: true,
        metric: { ...mockCustomMetric, is_favorite: false },
      });

      const updateData = {
        is_favorite: false,
      };

      const result = await metricsService.updateMetric('metric_1', updateData);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/metrics/metric_1',
        expect.objectContaining(updateData)
      );
      expect(result.metric.is_favorite).toBe(false);
    });

    it('should support updating name and description', async () => {
      mockApi.patch.mockResolvedValue({
        success: true,
        metric: {
          ...mockCustomMetric,
          name: 'Updated Metric',
          description: 'New description',
        },
      });

      await metricsService.updateMetric('metric_1', {
        name: 'Updated Metric',
        description: 'New description',
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/metrics/metric_1',
        expect.objectContaining({
          name: 'Updated Metric',
          description: 'New description',
        })
      );
    });

    it('should support updating formula config', async () => {
      const newConfig = {
        numeratorField: 'totalGain',
        denominatorField: 'marketValue',
      };
      mockApi.patch.mockResolvedValue({
        success: true,
        metric: {
          ...mockCustomMetric,
          formula_config: newConfig,
        },
      });

      await metricsService.updateMetric('metric_1', {
        formula_config: newConfig,
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/metrics/metric_1',
        expect.objectContaining({ formula_config: newConfig })
      );
    });

    it('should support updating threshold alert', async () => {
      mockApi.patch.mockResolvedValue({
        success: true,
        metric: {
          ...mockCustomMetric,
          threshold_alert: 20,
        },
      });

      await metricsService.updateMetric('metric_1', {
        threshold_alert: 20,
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/metrics/metric_1',
        expect.objectContaining({ threshold_alert: 20 })
      );
    });

    it('should support partial updates', async () => {
      mockApi.patch.mockResolvedValue({
        success: true,
        metric: mockCustomMetric,
      });

      await metricsService.updateMetric('metric_1', {
        display_format: 'currency',
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/metrics/metric_1',
        { display_format: 'currency' }
      );
    });
  });

  describe('deleteMetric', () => {
    it('should delete metric with DELETE request', async () => {
      mockApi.delete.mockResolvedValue({
        success: true,
        message: 'Metric deleted',
      });

      const result = await metricsService.deleteMetric('metric_1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/metrics/metric_1');
      expect(result.success).toBe(true);
    });

    it('should throw on deletion error', async () => {
      mockApi.delete.mockRejectedValue(new Error('Deletion failed'));

      await expect(metricsService.deleteMetric('metric_1')).rejects.toThrow(
        'Deletion failed'
      );
    });

    it('should throw on unauthorized deletion', async () => {
      mockApi.delete.mockRejectedValue(
        new Error('Not authorized to delete metric')
      );

      await expect(metricsService.deleteMetric('metric_1')).rejects.toThrow(
        'Not authorized to delete metric'
      );
    });
  });
});
