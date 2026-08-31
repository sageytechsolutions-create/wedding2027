import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockApi, resetApiMocks } from '../../test/mocks/api';
import {
  mockPortfolioSnapshot,
  mockPortfolioHealth,
  mockReportResponse,
  mockCacheStats,
} from '../../test/fixtures/data';

vi.mock('../../lib/api', async () => {
  const { mockApi } = await import('../../test/mocks/api');
  return { api: mockApi };
});

import { reportService } from '../reportService';

describe('reportService', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  describe('generateReport', () => {
    it('should call POST /api/reports/generate with correct parameters', async () => {
      mockApi.post.mockResolvedValue(mockReportResponse);

      const result = await reportService.generateReport('portfolio_1', 'summary');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/reports/generate',
        expect.objectContaining({
          portfolio_id: 'portfolio_1',
          report_type: 'summary',
        })
      );
      expect(result.success).toBe(true);
      expect(result.report.id).toBe('report_1');
    });

    it('should default report_type to summary', async () => {
      mockApi.post.mockResolvedValue(mockReportResponse);

      await reportService.generateReport('portfolio_1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/reports/generate',
        expect.objectContaining({
          report_type: 'summary',
        })
      );
    });

    it('should handle different report types', async () => {
      mockApi.post.mockResolvedValue(mockReportResponse);

      for (const type of ['summary', 'full', 'executive'] as const) {
        await reportService.generateReport('portfolio_1', type);
        expect(mockApi.post).toHaveBeenCalledWith(
          '/api/reports/generate',
          expect.objectContaining({ report_type: type })
        );
      }
    });

    it('should throw on API error', async () => {
      mockApi.post.mockRejectedValue(new Error('API Error'));

      await expect(reportService.generateReport('portfolio_1')).rejects.toThrow('API Error');
    });
  });

  describe('getPortfolioSnapshot', () => {
    it('should fetch portfolio snapshot data', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        snapshot: mockPortfolioSnapshot,
      });

      const result = await reportService.getPortfolioSnapshot('portfolio_1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/reports/portfolio/portfolio_1/snapshot');
      expect(result.snapshot.metrics.totalValue).toBe(1350000);
      expect(result.snapshot.properties).toHaveLength(1);
    });

    it('should include portfolio metrics in snapshot', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        snapshot: mockPortfolioSnapshot,
      });

      const result = await reportService.getPortfolioSnapshot('portfolio_1');
      const metrics = result.snapshot.metrics;

      expect(metrics).toHaveProperty('totalValue');
      expect(metrics).toHaveProperty('totalGain');
      expect(metrics).toHaveProperty('avgROI');
      expect(metrics).toHaveProperty('monthlyCashFlow');
    });
  });

  describe('getPortfolioHealth', () => {
    it('should fetch portfolio health assessment', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        portfolio_id: 'portfolio_1',
        health: mockPortfolioHealth,
      });

      const result = await reportService.getPortfolioHealth('portfolio_1');

      expect(mockApi.get).toHaveBeenCalledWith('/api/reports/portfolio/portfolio_1/health');
      expect(result.health.score).toBe(78);
      expect(result.health.status).toBe('good');
    });

    it('should include recommendations in health data', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        portfolio_id: 'portfolio_1',
        health: mockPortfolioHealth,
      });

      const result = await reportService.getPortfolioHealth('portfolio_1');

      expect(result.health.recommendations).toBeInstanceOf(Array);
      expect(result.health.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getPortfolioTrends', () => {
    it('should fetch trends with default 12 months', async () => {
      const mockTrends = [
        { date: new Date(), value: 1200000, roi: 8, cashFlow: 4500 },
      ];
      mockApi.get.mockResolvedValue({
        success: true,
        portfolio_id: 'portfolio_1',
        trends: mockTrends,
        period_months: 12,
      });

      const result = await reportService.getPortfolioTrends('portfolio_1');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/reports/portfolio/portfolio_1/trends')
      );
      expect(result.period_months).toBe(12);
    });

    it('should support custom month ranges', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        portfolio_id: 'portfolio_1',
        trends: [],
        period_months: 6,
      });

      await reportService.getPortfolioTrends('portfolio_1', 6);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('months=6')
      );
    });
  });

  describe('getAggregations', () => {
    it('should fetch property aggregations', async () => {
      const mockAgg = {
        success: true,
        portfolio_id: 'portfolio_1',
        by_property: [
          { propertyId: 'prop_1', percentage: 100, value: 1350000 },
        ],
      };
      mockApi.get.mockResolvedValue(mockAgg);

      const result = await reportService.getAggregations('portfolio_1', 'property');

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('type=property')
      );
      expect(result.by_property).toBeDefined();
    });

    it('should fetch city aggregations', async () => {
      const mockAgg = {
        success: true,
        portfolio_id: 'portfolio_1',
        by_city: [
          { city: 'Denver', count: 2, value: 1015000, percentage: 75.2 },
        ],
      };
      mockApi.get.mockResolvedValue(mockAgg);

      const result = await reportService.getAggregations('portfolio_1', 'city');

      expect(result.by_city).toBeDefined();
    });

    it('should fetch all aggregations', async () => {
      const mockAgg = {
        success: true,
        portfolio_id: 'portfolio_1',
        by_property: [],
        by_city: [],
      };
      mockApi.get.mockResolvedValue(mockAgg);

      const result = await reportService.getAggregations('portfolio_1', 'all');

      expect(result.by_property).toBeDefined();
      expect(result.by_city).toBeDefined();
    });
  });

  describe('getCacheStatus', () => {
    it('should fetch cache statistics', async () => {
      mockApi.get.mockResolvedValue({
        success: true,
        cache_stats: mockCacheStats,
        memory_usage: { used: 5242880, peak: 10485760, estimated: 5242880 },
      });

      const result = await reportService.getCacheStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/api/reports/cache/status');
      expect(result.cache_stats.hitRate).toBe(0.75);
      expect(result.memory_usage).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear report cache', async () => {
      mockApi.delete.mockResolvedValue({
        success: true,
        message: 'Cache cleared',
      });

      const result = await reportService.clearCache();

      expect(mockApi.delete).toHaveBeenCalledWith('/api/reports/cache/clear');
      expect(result.success).toBe(true);
    });
  });

  describe('downloadReport', () => {
    it('should fetch report as blob', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await reportService.downloadReport('report_1');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('should throw on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(reportService.downloadReport('invalid_id')).rejects.toThrow();
    });
  });
});
