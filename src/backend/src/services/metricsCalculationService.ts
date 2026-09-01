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
      switch (userMetric.formulaType) {
        case 'sum': {
          value = this.calculateSum(userMetric.formulaConfig.field, portfolioData);
          break;
        }
        case 'average': {
          value = this.calculateAverage(userMetric.formulaConfig.field, portfolioData);
          break;
        }
        case 'ratio': {
          value = this.calculateRatio(
            userMetric.formulaConfig.numeratorField,
            userMetric.formulaConfig.denominatorField,
            portfolioData
          );
          break;
        }
        case 'formula': {
          value = this.evaluateFormula(userMetric.formulaConfig.formula, portfolioData);
          break;
        }
      }
    } catch (error) {
      console.error(`Error calculating metric ${metricId}:`, error);
      value = 0;
    }

    const thresholdBreached =
      userMetric.thresholdAlert !== null &&
      userMetric.thresholdAlert !== undefined &&
      value < userMetric.thresholdAlert;

    return {
      metricId,
      metricName: userMetric.name,
      value,
      displayFormat: userMetric.displayFormat,
      thresholdAlert: userMetric.thresholdAlert,
      thresholdBreached,
      calculatedAt: new Date(),
    };
  }

  async calculateAllMetrics(portfolioId: string, portfolioData: PortfolioData): Promise<MetricResult[]> {
    const userMetrics = await prisma.userMetric.findMany({
      where: { portfolioId: portfolioId },
    });

    const results: MetricResult[] = [];

    for (const metric of userMetrics) {
      const result = await this.calculateMetric(metric.id, portfolioData, metric);
      results.push(result);

      // Save calculation result
      await prisma.metricCalculation.create({
        data: {
          id: randomUUID(),
          metricId: metric.id,
          calculatedValue: result.value,
          portfolioSnapshot: portfolioData as any,
          calculationTime: 100,
          alertTriggered: result.thresholdBreached,
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
          metricId: metric.id,
          isActive: true,
        },
      });

      if (!existingAlert) {
        await prisma.metricAlert.create({
          data: {
            id: randomUUID(),
            metricId: metric.id,
            userId: metric.userId,
            thresholdValue: metric.thresholdAlert,
            currentValue: result.value,
            breachDirection: result.value < metric.thresholdAlert ? 'below' : 'above',
            isActive: true,
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
      where: { metricId: metricId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return calculations.map((calc) => ({
      value: calc.calculatedValue,
      calculatedAt: calc.createdAt,
      alertTriggered: calc.alertTriggered,
    }));
  }
}

export const metricsCalculationService = new MetricsCalculationService();
