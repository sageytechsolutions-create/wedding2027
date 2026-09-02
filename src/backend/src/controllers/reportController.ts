import { Request, Response } from 'express';
import { reportGenerationService } from '../services/reportGenerationService';
import { reportCacheService } from '../services/reportCacheService';
import { portfolioDataService } from '../services/portfolioDataService';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export class ReportController {
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id, report_type = 'summary' } = req.body;

      if (!portfolio_id || !['summary', 'full', 'executive'].includes(report_type)) {
        res.status(400).json({ error: 'Invalid portfolio_id or report_type' });
        return;
      }

      // Check cache first
      let reportBuffer = await reportCacheService.getCachedReport(portfolio_id, report_type);

      if (!reportBuffer) {
        // Generate new report
        reportBuffer = await reportGenerationService.generatePortfolioReport(portfolio_id, report_type);

        // Cache the report
        await reportCacheService.cacheReport(portfolio_id, report_type, reportBuffer);
      }

      // Save metadata
      const metadata = await reportGenerationService.saveReportMetadata(
        portfolio_id,
        req.user.id,
        report_type,
        reportBuffer.length
      );

      // Generate download URL
      const downloadUrl = `/api/reports/${metadata.reportId}/download`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      res.json({
        success: true,
        report: {
          id: metadata.reportId,
          portfolio_id,
          report_type,
          status: 'generated',
          download_url: downloadUrl,
          expires_at: expiresAt,
          file_size: metadata.fileSize,
          generated_at: metadata.generatedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate report';
      res.status(500).json({ error: message });
    }
  }

  async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // TODO: Fetch report from storage (S3, file system, etc.)
      // For now, generate on-the-fly
      const mockReportBuffer = Buffer.from('Mock PDF Report Content');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="portfolio_report_${id}.pdf"`);
      res.setHeader('Content-Length', mockReportBuffer.length);

      res.send(mockReportBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Failed to download report' });
    }
  }

  async getReportHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id, limit = 10 } = req.query;

      if (!portfolio_id) {
        res.status(400).json({ error: 'portfolio_id required' });
        return;
      }

      const history = await reportGenerationService.getReportHistory(portfolio_id as string, parseInt(limit as string) || 10);

      res.json({
        success: true,
        portfolio_id,
        reports: history,
        count: history.length,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get report history' });
    }
  }

  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      // TODO: Delete from storage and database
      console.log(`Deleting report ${id}`);

      res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete report' });
    }
  }

  async getCacheStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await reportCacheService.getCacheStats();
      const memoryUsage = await reportCacheService.getMemoryUsage();

      res.json({
        success: true,
        cache_stats: stats,
        memory_usage: memoryUsage,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cache status' });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await reportCacheService.clearAllCache();

      res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }

  async getPortfolioSnapshot(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id } = req.params;

      const snapshot = await portfolioDataService.getPortfolioSnapshot(portfolio_id, req.user.id);

      res.json({
        success: true,
        snapshot,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get snapshot';
      res.status(500).json({ error: message });
    }
  }

  async getPortfolioHealth(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id } = req.params;

      const health = await portfolioDataService.getPortfolioHealth(portfolio_id);

      res.json({
        success: true,
        portfolio_id,
        health,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get portfolio health' });
    }
  }

  async getPortfolioTrends(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id } = req.params;
      const { months = 12 } = req.query;

      const trends = await portfolioDataService.getPortfolioTrends(portfolio_id, parseInt(months as string) || 12);

      res.json({
        success: true,
        portfolio_id,
        trends,
        period_months: months,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get trends' });
    }
  }

  async getAggregations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id } = req.params;
      const { type = 'all' } = req.query;

      let byProperty, byCity;

      if (type === 'all' || type === 'property') {
        byProperty = await portfolioDataService.aggregateByProperty(portfolio_id);
      }

      if (type === 'all' || type === 'city') {
        byCity = await portfolioDataService.aggregateByCity(portfolio_id);
      }

      res.json({
        success: true,
        portfolio_id,
        ...(byProperty && { by_property: byProperty }),
        ...(byCity && { by_city: byCity }),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get aggregations' });
    }
  }
}

export const reportController = new ReportController();
