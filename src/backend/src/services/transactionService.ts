import { prisma } from '../config/database.js';
import { Errors } from '../utils/errors.js';

export interface CreateTransactionInput {
  portfolioPropertyId: string;
  transactionType: 'income' | 'expense' | 'mortgage';
  category: string;
  amount: number;
  date: Date;
  description?: string;
}

export class TransactionService {
  static async addTransaction(userId: string, input: CreateTransactionInput) {
    // Verify portfolio property belongs to user
    const portfolioProperty = await prisma.portfolioProperty.findFirst({
      where: { id: input.portfolioPropertyId, userId },
    });

    if (!portfolioProperty) {
      throw Errors.portfolioNotFound(input.portfolioPropertyId);
    }

    return prisma.transaction.create({
      data: {
        ...input,
        userId,
        propertyId: portfolioProperty.propertyId,
      },
    });
  }

  static async getTransactions(userId: string, portfolioPropertyId?: string) {
    const where: any = { userId };

    if (portfolioPropertyId) {
      where.portfolioPropertyId = portfolioPropertyId;
    }

    return prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        portfolioProperty: {
          include: { property: true },
        },
      },
    });
  }

  static async updateTransaction(userId: string, transactionId: string, data: any) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return prisma.transaction.update({
      where: { id: transactionId },
      data,
    });
  }

  static async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    });
  }

  static async getTransactionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    portfolioPropertyId?: string
  ) {
    const where: any = {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (portfolioPropertyId) {
      where.portfolioPropertyId = portfolioPropertyId;
    }

    return prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  static async getCategoryTotals(userId: string, startDate: Date, endDate: Date) {
    const transactions = await this.getTransactionsByDateRange(userId, startDate, endDate);

    const totals: { [key: string]: number } = {};

    transactions.forEach((tx) => {
      const amount = tx.transactionType === 'income' ? tx.amount : -tx.amount;
      totals[tx.category] = (totals[tx.category] || 0) + amount;
    });

    return totals;
  }
}
