import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PortfolioMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalGain: number;
  gainPercentage: number;
  ytdROI: number;
  annualizedReturns: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  avgCapRate: number;
  avgROI: number;
  propertiesCount: number;
  marketValue: number;
  loanBalance: number;
  equity: number;
}

export interface PropertyData {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  acquisitionDate: Date;
  acquisitionPrice: number;
  currentValue: number;
  gain: number;
  gainPercentage: number;
  roi: number;
  annualRentIncome: number;
  annualExpenses: number;
  annualNetIncome: number;
  capRate: number;
  loanBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
}

export interface PortfolioSnapshot {
  portfolioId: string;
  userId: string;
  metrics: PortfolioMetrics;
  properties: PropertyData[];
  generatedAt: Date;
}

export class PortfolioDataService {
  async getPortfolioSnapshot(portfolioId: string, userId: string): Promise<PortfolioSnapshot> {
    try {
      // Get properties for portfolio
      const properties = await this.getPortfolioProperties(portfolioId);

      // Calculate metrics
      const metrics = this.calculatePortfolioMetrics(properties);

      return {
        portfolioId,
        userId,
        metrics,
        properties,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error getting portfolio snapshot:', error);
      throw new Error('Failed to get portfolio snapshot');
    }
  }

  private async getPortfolioProperties(portfolioId: string): Promise<PropertyData[]> {
    // TODO: Fetch from database
    // For now, return mock data
    const mockProperties: PropertyData[] = [
      {
        id: 'prop_1',
        address: '456 Main St',
        city: 'Denver',
        state: 'CO',
        zipCode: '80202',
        acquisitionDate: new Date('2022-03-15'),
        acquisitionPrice: 450000,
        currentValue: 520000,
        gain: 70000,
        gainPercentage: 15.56,
        roi: 15.56,
        annualRentIncome: 30000,
        annualExpenses: 9000,
        annualNetIncome: 21000,
        capRate: 4.04,
        loanBalance: 360000,
        interestRate: 6.5,
        monthlyPayment: 2280,
      },
      {
        id: 'prop_2',
        address: '789 Oak Ave',
        city: 'Denver',
        state: 'CO',
        zipCode: '80203',
        acquisitionDate: new Date('2021-06-20'),
        acquisitionPrice: 425000,
        currentValue: 495000,
        gain: 70000,
        gainPercentage: 16.47,
        roi: 16.47,
        annualRentIncome: 25000,
        annualExpenses: 8000,
        annualNetIncome: 17000,
        capRate: 3.43,
        loanBalance: 340000,
        interestRate: 5.5,
        monthlyPayment: 1945,
      },
      {
        id: 'prop_3',
        address: '321 Pine Rd',
        city: 'Boulder',
        state: 'CO',
        zipCode: '80301',
        acquisitionDate: new Date('2023-01-10'),
        acquisitionPrice: 625000,
        currentValue: 680000,
        gain: 55000,
        gainPercentage: 8.8,
        roi: 8.8,
        annualRentIncome: 35000,
        annualExpenses: 12000,
        annualNetIncome: 23000,
        capRate: 3.38,
        loanBalance: 500000,
        interestRate: 7.0,
        monthlyPayment: 3740,
      },
    ];

    return mockProperties;
  }

  private calculatePortfolioMetrics(properties: PropertyData[]): PortfolioMetrics {
    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCostBasis = properties.reduce((sum, p) => sum + p.acquisitionPrice, 0);
    const totalGain = totalValue - totalCostBasis;
    const gainPercentage = (totalGain / totalCostBasis) * 100;

    const totalAnnualRent = properties.reduce((sum, p) => sum + p.annualRentIncome, 0);
    const totalAnnualExpenses = properties.reduce((sum, p) => sum + p.annualExpenses, 0);
    const totalAnnualNetIncome = totalAnnualRent - totalAnnualExpenses;
    const monthlyCashFlow = totalAnnualNetIncome / 12;

    const totalLoanBalance = properties.reduce((sum, p) => sum + (p.loanBalance || 0), 0);
    const equity = totalValue - totalLoanBalance;

    return {
      totalValue,
      totalCostBasis,
      totalGain,
      gainPercentage: parseFloat(gainPercentage.toFixed(2)),
      ytdROI: parseFloat((gainPercentage * 0.9).toFixed(2)), // Mock YTD
      annualizedReturns: parseFloat((gainPercentage * 0.85).toFixed(2)), // Mock annualized
      monthlyCashFlow: parseFloat(monthlyCashFlow.toFixed(2)),
      annualCashFlow: totalAnnualNetIncome,
      avgCapRate: parseFloat((properties.reduce((sum, p) => sum + p.capRate, 0) / properties.length).toFixed(2)),
      avgROI: parseFloat((properties.reduce((sum, p) => sum + p.roi, 0) / properties.length).toFixed(2)),
      propertiesCount: properties.length,
      marketValue: totalValue,
      loanBalance: totalLoanBalance,
      equity,
    };
  }

  async getPropertyValuations(portfolioId: string): Promise<Array<{ propertyId: string; value: number; date: Date }>> {
    // TODO: Fetch from valuation service
    // For now, return mock data
    return [
      { propertyId: 'prop_1', value: 520000, date: new Date() },
      { propertyId: 'prop_2', value: 495000, date: new Date() },
      { propertyId: 'prop_3', value: 680000, date: new Date() },
    ];
  }

  async getMarketAnalysis(portfolioId: string): Promise<{ temperature: string; appreciation: number; trend: string }> {
    // TODO: Fetch from market analysis service (Sprint 1)
    return {
      temperature: 'Warm',
      appreciation: 4.5,
      trend: 'stable',
    };
  }

  async getRiskAssessment(
    portfolioId: string
  ): Promise<{ overallScore: number; marketRisk: number; propertyRisk: number; financialRisk: number }> {
    // TODO: Fetch from risk assessment model (Sprint 2)
    return {
      overallScore: 32,
      marketRisk: 35,
      propertyRisk: 28,
      financialRisk: 42,
    };
  }

  async getPortfolioComparison(
    portfolioId1: string,
    portfolioId2: string
  ): Promise<{ comparison: Record<string, any>; differences: Record<string, any> }> {
    const snapshot1 = await this.getPortfolioSnapshot(portfolioId1, '');
    const snapshot2 = await this.getPortfolioSnapshot(portfolioId2, '');

    return {
      comparison: {
        portfolio1: snapshot1.metrics,
        portfolio2: snapshot2.metrics,
      },
      differences: {
        valueDiff: snapshot1.metrics.totalValue - snapshot2.metrics.totalValue,
        roiDiff: snapshot1.metrics.avgROI - snapshot2.metrics.avgROI,
        cashFlowDiff: snapshot1.metrics.annualCashFlow - snapshot2.metrics.annualCashFlow,
      },
    };
  }

  async getPortfolioTrends(
    portfolioId: string,
    months: number = 12
  ): Promise<Array<{ date: Date; value: number; roi: number; cashFlow: number }>> {
    // TODO: Fetch historical data from database
    // For now, generate mock data
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);

      trends.push({
        date,
        value: 1200000 + Math.random() * 150000,
        roi: 8 + Math.random() * 8,
        cashFlow: 4500 + Math.random() * 1000,
      });
    }

    return trends;
  }

  async aggregateByProperty(
    portfolioId: string
  ): Promise<Array<{ propertyId: string; percentage: number; value: number }>> {
    const properties = await this.getPortfolioProperties(portfolioId);
    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);

    return properties.map((p) => ({
      propertyId: p.id,
      percentage: (p.currentValue / totalValue) * 100,
      value: p.currentValue,
    }));
  }

  async aggregateByCity(
    portfolioId: string
  ): Promise<Array<{ city: string; count: number; value: number; percentage: number }>> {
    const properties = await this.getPortfolioProperties(portfolioId);
    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);

    const byCity: { [key: string]: { count: number; value: number } } = {};

    properties.forEach((p) => {
      if (!byCity[p.city]) {
        byCity[p.city] = { count: 0, value: 0 };
      }
      byCity[p.city].count++;
      byCity[p.city].value += p.currentValue;
    });

    return Object.entries(byCity).map(([city, data]) => ({
      city,
      count: data.count,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
    }));
  }

  async getPortfolioHealth(portfolioId: string): Promise<{
    score: number;
    status: string;
    recommendations: string[];
  }> {
    const snapshot = await this.getPortfolioSnapshot(portfolioId, '');
    const metrics = snapshot.metrics;

    const recommendations: string[] = [];
    let score = 100;

    // Diversification check
    if (metrics.propertiesCount < 3) {
      recommendations.push('Consider diversifying with additional properties');
      score -= 20;
    }

    // Cash flow check
    if (metrics.monthlyCashFlow < 2000) {
      recommendations.push('Monthly cash flow is below optimal level');
      score -= 15;
    }

    // ROI check
    if (metrics.avgROI < 8) {
      recommendations.push('Average ROI is below market expectations');
      score -= 10;
    }

    // Debt check
    const debtRatio = (metrics.loanBalance / metrics.totalValue) * 100;
    if (debtRatio > 70) {
      recommendations.push('Debt-to-value ratio is high, consider paying down loans');
      score -= 15;
    }

    const status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

    return { score, status, recommendations };
  }
}

export const portfolioDataService = new PortfolioDataService();
