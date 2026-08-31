import { Request, Response } from 'express';
import { metricsCalculationService } from '../services/metricsCalculationService';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export class MetricsController {
  async calculateMetrics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { portfolio_id } = req.body;

      if (!portfolio_id) {
        res.status(400).json({ error: 'portfolio_id required' });
        return;
      }

      // TODO: Fetch actual portfolio data from Sprint 3 services
      const mockPortfolioData = {
        totalValue: 1350000,
        totalCostBasis: 1100000,
        totalRentIncome: 90000,
        totalExpenses: 29000,
        monthlyCashFlow: 5083,
        properties: [
          {
            id: 'prop_1',
            address: '456 Main St',
            currentValue: 520000,
            costBasis: 450000,
            annualRent: 30000,
            annualExpenses: 9000,
            roi: 15.6,
          },
        ],
      };

      const results = await metricsCalculationService.calculateAllMetrics(
        portfolio_id,
        mockPortfolioData
      );

      res.json({
        success: true,
        portfolio_id,
        metrics: results,
        calculated_at: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate metrics';
      res.status(500).json({ error: message });
    }
  }

  async validateFormula(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { formula } = req.body;

      if (!formula || typeof formula !== 'string') {
        res.status(400).json({ error: 'formula required and must be a string' });
        return;
      }

      const validation = await metricsCalculationService.validateFormula(formula);

      res.json({
        success: validation.valid,
        formula,
        valid: validation.valid,
        error: validation.error,
      });
    } catch (error) {
      res.status(500).json({ error: 'Validation failed' });
    }
  }

  async getMetricHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { metricId } = req.params;
      const { limit = 30 } = req.query;

      const history = await metricsCalculationService.getMetricHistory(metricId, parseInt(limit as string) || 30);

      res.json({
        success: true,
        metric_id: metricId,
        history,
        count: history.length,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metric history' });
    }
  }

  async getAvailableMetrics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Return pre-built metrics available to users
      const builtInMetrics = [
        {
          id: 'builtin_1',
          name: 'Cash-on-Cash Return',
          description: 'Annual cash flow divided by cash invested',
          formulaType: 'ratio',
          displayFormat: 'percentage',
        },
        {
          id: 'builtin_2',
          name: 'Debt Service Coverage Ratio',
          description: 'NOI divided by annual debt payment',
          formulaType: 'ratio',
          displayFormat: 'number',
        },
        {
          id: 'builtin_3',
          name: 'Cap Rate',
          description: 'Annual net income divided by property value',
          formulaType: 'ratio',
          displayFormat: 'percentage',
        },
        {
          id: 'builtin_4',
          name: 'Total Cash Flow',
          description: 'Sum of all annual cash flow',
          formulaType: 'sum',
          displayFormat: 'currency',
        },
      ];

      res.json({
        success: true,
        metrics: builtInMetrics,
        count: builtInMetrics.length,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }

  async createAlert(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { metric_id, threshold_value } = req.body;

      if (!metric_id || typeof threshold_value !== 'number') {
        res.status(400).json({ error: 'metric_id and threshold_value required' });
        return;
      }

      const alert = await prisma.metricAlert.create({
        data: {
          id: randomUUID(),
          metric_id,
          user_id: req.user.id,
          threshold_value,
          is_active: true,
        },
      });

      res.status(201).json({
        success: true,
        alert: {
          id: alert.id,
          metric_id: alert.metric_id,
          threshold_value: alert.threshold_value,
          is_active: alert.is_active,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create alert';
      res.status(500).json({ error: message });
    }
  }

  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { metric_id, active_only = true } = req.query;

      const where: any = { user_id: req.user.id };
      if (active_only === 'true') {
        where.is_active = true;
      }
      if (metric_id) {
        where.metric_id = metric_id;
      }

      const alerts = await prisma.metricAlert.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        alerts,
        count: alerts.length,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  }

  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { alertId } = req.params;

      const alert = await prisma.metricAlert.findUnique({
        where: { id: alertId },
      });

      if (!alert || alert.user_id !== req.user.id) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      const updated = await prisma.metricAlert.update({
        where: { id: alertId },
        data: { acknowledged_at: new Date() },
      });

      res.json({
        success: true,
        alert: {
          id: updated.id,
          acknowledged_at: updated.acknowledged_at,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }

  async updateMetric(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { metricId } = req.params;
      const { name, description, formula_config, display_format, threshold_alert, is_favorite } = req.body;

      const metric = await prisma.userMetric.findUnique({
        where: { id: metricId },
      });

      if (!metric || metric.user_id !== req.user.id) {
        res.status(404).json({ error: 'Metric not found' });
        return;
      }

      const updated = await prisma.userMetric.update({
        where: { id: metricId },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(formula_config && { formula_config }),
          ...(display_format && { display_format }),
          ...(threshold_alert !== undefined && { threshold_alert }),
          ...(is_favorite !== undefined && { is_favorite }),
        },
      });

      res.json({
        success: true,
        metric: updated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update metric';
      res.status(500).json({ error: message });
    }
  }

  async deleteMetric(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { metricId } = req.params;

      const metric = await prisma.userMetric.findUnique({
        where: { id: metricId },
      });

      if (!metric || metric.user_id !== req.user.id) {
        res.status(404).json({ error: 'Metric not found' });
        return;
      }

      await prisma.userMetric.delete({
        where: { id: metricId },
      });

      res.json({
        success: true,
        message: 'Metric deleted',
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete metric' });
    }
  }
}

export const metricsController = new MetricsController();
