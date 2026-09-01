import { prisma } from '../config/database.js';
import { Errors } from '../utils/errors.js';

export interface CreatePortfolioPropertyInput {
  propertyId: string;
  acquisitionDate: Date;
  acquisitionPrice: number;
  downPayment?: number;
  loanAmount?: number;
  interestRate?: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
  annualMaintenanceEstimate?: number;
  notes?: string;
}

export class PortfolioService {
  static async addProperty(userId: string, input: CreatePortfolioPropertyInput) {
    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
    });

    if (!property) {
      throw Errors.propertyNotFound(input.propertyId);
    }

    // Check if property already in portfolio
    const existing = await prisma.portfolioProperty.findFirst({
      where: { userId, propertyId: input.propertyId },
    });

    if (existing) {
      throw new Error('Property already in portfolio');
    }

    return prisma.portfolioProperty.create({
      data: {
        ...input,
        userId,
      },
      include: { property: true },
    });
  }

  static async getPortfolio(userId: string) {
    const properties = await prisma.portfolioProperty.findMany({
      where: { userId },
      include: {
        property: true,
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return properties;
  }

  static async getPropertyDetails(userId: string, portfolioPropertyId: string) {
    const property = await prisma.portfolioProperty.findFirst({
      where: { id: portfolioPropertyId, userId },
      include: {
        property: true,
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!property) {
      throw Errors.portfolioNotFound(portfolioPropertyId);
    }

    return property;
  }

  static async updateProperty(userId: string, portfolioPropertyId: string, data: any) {
    const existing = await prisma.portfolioProperty.findFirst({
      where: { id: portfolioPropertyId, userId },
    });

    if (!existing) {
      throw Errors.portfolioNotFound(portfolioPropertyId);
    }

    return prisma.portfolioProperty.update({
      where: { id: portfolioPropertyId },
      data,
      include: { property: true },
    });
  }

  static async removeProperty(userId: string, portfolioPropertyId: string) {
    const existing = await prisma.portfolioProperty.findFirst({
      where: { id: portfolioPropertyId, userId },
    });

    if (!existing) {
      throw Errors.portfolioNotFound(portfolioPropertyId);
    }

    await prisma.portfolioProperty.delete({
      where: { id: portfolioPropertyId },
    });
  }

  // Calculate portfolio metrics
  static calculateROI(acquisitionPrice: number, currentValue: number, expenses: number) {
    if (acquisitionPrice <= 0) return 0;
    return ((currentValue - acquisitionPrice - expenses) / acquisitionPrice) * 100;
  }

  static calculateCashFlow(incomeTransactions: number[], expenseTransactions: number[]) {
    const income = incomeTransactions.reduce((a, b) => a + b, 0);
    const expenses = expenseTransactions.reduce((a, b) => a + b, 0);
    return income - expenses;
  }

  static async getPortfolioSummary(userId: string) {
    const properties = await this.getPortfolio(userId);

    let totalInvestedCapital = 0;
    let totalCurrentValue = 0;
    let totalAnnualExpenses = 0;

    properties.forEach((prop) => {
      totalInvestedCapital += prop.acquisitionPrice;
      totalCurrentValue += prop.property.estimatedValue || prop.acquisitionPrice;
      totalAnnualExpenses +=
        (prop.annualPropertyTax || 0) +
        (prop.annualInsurance || 0) +
        (prop.annualMaintenanceEstimate || 0);
    });

    const totalAppreciation = totalCurrentValue - totalInvestedCapital;
    const roi = totalInvestedCapital > 0 ? (totalAppreciation / totalInvestedCapital) * 100 : 0;

    return {
      propertyCount: properties.length,
      totalInvestedCapital,
      totalCurrentValue,
      totalAppreciation,
      roi,
      totalAnnualExpenses,
    };
  }
}
