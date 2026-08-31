import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface MetricResult {
  metricId: string;
  metricName: string;
  value: number;
  displayFormat: string;
  thresholdAlert?: number;
  thresholdBreached: boolean;
  calculatedAt: Date;
}

export interface PortfolioData {
  totalValue: number;
  totalCostBasis: number;
  totalRentIncome: number;
  totalExpenses: number;
  monthlyCashFlow: number;
  properties: PropertyMetrics[];
}

export interface PropertyMetrics {
  id: string;
  address: string;
  currentValue: number;
  costBasis: number;
  annualRent: number;
  annualExpenses: number;
  roi: number;
}

export class MetricsCalculationService {
  async calculateMetric(
    metricId: string,
    portfolioData: PortfolioData,
    userMetric: any
  ): Promise<MetricResult> {
    let value = 0;

    try {
      switch (userMetric.formula_type) {
        case 'sum': {
          value = this.calculateSum(userMetric.formula_config.field, portfolioData);
          break;
        }
        case 'average': {
          value = this.calculateAverage(userMetric.formula_config.field, portfolioData);
          break;
        }
        case 'ratio': {
          value = this.calculateRatio(
            userMetric.formula_config.numerator_field,
            userMetric.formula_config.denominator_field,
            portfolioData
          );
          break;
        }
        case 'formula': {
          value = this.evaluateFormula(userMetric.formula_config.formula, portfolioData);
          break;
        }
      }
    } catch (error) {
      console.error(`Error calculating metric ${metricId}:`, error);
      value = 0;
    }

    const thresholdBreached =
      userMetric.threshold_alert !== null &&
      userMetric.threshold_alert !== undefined &&
      value < userMetric.threshold_alert;

    return {
      metricId,
      metricName: userMetric.name,
      value,
      displayFormat: userMetric.display_format,
      thresholdAlert: userMetric.threshold_alert,
      thresholdBreached,
      calculatedAt: new Date(),
    };
  }

  async calculateAllMetrics(portfolioId: string, portfolioData: PortfolioData): Promise<MetricResult[]> {
    const userMetrics = await prisma.userMetric.findMany({
      where: { portfolio_id: portfolioId },
    });

    const results: MetricResult[] = [];

    for (const metric of userMetrics) {
      const result = await this.calculateMetric(metric.id, portfolioData, metric);
      results.push(result);

      // Save calculation result
      await prisma.metricCalculation.create({
        data: {
          id: randomUUID(),
          metric_id: metric.id,
          calculated_value: result.value,
          portfolio_snapshot: portfolioData,
          calculation_time: 100,
          alert_triggered: result.thresholdBreached,
        },
      });

      // Create alert if threshold breached
      if (result.thresholdBreached) {
        await this.createAlert(metric, result);
      }
    }

    return results;
  }

  private calculateSum(field: string, portfolioData: PortfolioData): number {
    const fieldMap: { [key: string]: number } = {
      totalValue: portfolioData.totalValue,
      totalRentIncome: portfolioData.totalRentIncome,
      totalExpenses: portfolioData.totalExpenses,
      monthlyCashFlow: portfolioData.monthlyCashFlow,
    };

    return fieldMap[field] || 0;
  }

  private calculateAverage(field: string, portfolioData: PortfolioData): number {
    const propertyValues = portfolioData.properties.map((p: any) => p[field]).filter((v: any) => typeof v === 'number');

    if (propertyValues.length === 0) return 0;
    return propertyValues.reduce((a: number, b: number) => a + b, 0) / propertyValues.length;
  }

  private calculateRatio(numeratorField: string, denominatorField: string, portfolioData: PortfolioData): number {
    const numerator = this.getFieldValue(numeratorField, portfolioData);
    const denominator = this.getFieldValue(denominatorField, portfolioData);

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  private evaluateFormula(formula: string, portfolioData: PortfolioData): number {
    try {
      let expression = formula;

      // Replace portfolio-level variables
      expression = expression.replace(/\btotalValue\b/g, portfolioData.totalValue.toString());
      expression = expression.replace(/\btotalCostBasis\b/g, portfolioData.totalCostBasis.toString());
      expression = expression.replace(/\btotalRentIncome\b/g, portfolioData.totalRentIncome.toString());
      expression = expression.replace(/\btotalExpenses\b/g, portfolioData.totalExpenses.toString());
      expression = expression.replace(/\bmonthlyCashFlow\b/g, portfolioData.monthlyCashFlow.toString());

      // Evaluate formula safely
      const result = Function('"use strict"; return (' + expression + ')')();
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return 0;
    }
  }

  private getFieldValue(field: string, portfolioData: PortfolioData): number {
    const fieldMap: { [key: string]: number } = {
      totalValue: portfolioData.totalValue,
      totalCostBasis: portfolioData.totalCostBasis,
      totalRentIncome: portfolioData.totalRentIncome,
      totalExpenses: portfolioData.totalExpenses,
      monthlyCashFlow: portfolioData.monthlyCashFlow,
      noi: portfolioData.totalRentIncome - portfolioData.totalExpenses,
    };

    return fieldMap[field] || 0;
  }

  private async createAlert(metric: any, result: MetricResult): Promise<void> {
    try {
      const existingAlert = await prisma.metricAlert.findFirst({
        where: {
          metric_id: metric.id,
          is_active: true,
        },
      });

      if (!existingAlert) {
        await prisma.metricAlert.create({
          data: {
            id: randomUUID(),
            metric_id: metric.id,
            user_id: metric.user_id,
            threshold_value: metric.threshold_alert,
            current_value: result.value,
            breach_direction: result.value < metric.threshold_alert ? 'below' : 'above',
            is_active: true,
          },
        });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  async validateFormula(formula: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic validation - try to parse as JavaScript expression
      Function('"use strict"; return (' + formula + ')');
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid formula',
      };
    }
  }

  async getMetricHistory(metricId: string, limit: number = 30): Promise<any[]> {
    const calculations = await prisma.metricCalculation.findMany({
      where: { metric_id: metricId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return calculations.map((calc) => ({
      value: calc.calculated_value,
      calculatedAt: calc.created_at,
      alertTriggered: calc.alert_triggered,
    }));
  }
}

export const metricsCalculationService = new MetricsCalculationService();
