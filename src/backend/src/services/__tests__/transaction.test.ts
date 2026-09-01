import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionService } from '../transactionService';
import { mockTransaction, mockCategoryTotals } from '../../test/fixtures';

vi.mock('../../config/database', () => ({
  prisma: {
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/database';

describe('TransactionService', () => {
  const mockPrisma = prisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addTransaction', () => {
    it('should create income transaction', async () => {
      const input = {
        portfolioPropertyId: 'portfolio_prop_1',
        transactionType: 'income' as const,
        category: 'rent',
        amount: 2500,
        date: new Date(),
        description: 'Monthly rent',
      };

      mockPrisma.transaction.create.mockResolvedValue({
        id: 'trans_1',
        userId: 'user_1',
        ...input,
      });

      const result = await TransactionService.addTransaction('user_1', input);

      expect(result).toHaveProperty('id', 'trans_1');
      expect(result).toHaveProperty('transactionType', 'income');
      expect(result).toHaveProperty('category', 'rent');
    });

    it('should create expense transaction', async () => {
      const input = {
        portfolioPropertyId: 'portfolio_prop_1',
        transactionType: 'expense' as const,
        category: 'maintenance',
        amount: 500,
        date: new Date(),
        description: 'Roof repair',
      };

      mockPrisma.transaction.create.mockResolvedValue({
        id: 'trans_2',
        userId: 'user_1',
        ...input,
      });

      const result = await TransactionService.addTransaction('user_1', input);

      expect(result).toHaveProperty('transactionType', 'expense');
    });

    it('should create mortgage transaction', async () => {
      const input = {
        portfolioPropertyId: 'portfolio_prop_1',
        transactionType: 'mortgage' as const,
        category: 'principal',
        amount: 1500,
        date: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue({
        id: 'trans_3',
        userId: 'user_1',
        ...input,
      });

      const result = await TransactionService.addTransaction('user_1', input);

      expect(result).toHaveProperty('transactionType', 'mortgage');
    });

    it('should include optional description', async () => {
      const input = {
        portfolioPropertyId: 'portfolio_prop_1',
        transactionType: 'expense' as const,
        category: 'maintenance',
        amount: 300,
        date: new Date(),
        description: 'Emergency plumbing repair',
      };

      mockPrisma.transaction.create.mockResolvedValue({
        id: 'trans_4',
        userId: 'user_1',
        ...input,
      });

      await TransactionService.addTransaction('user_1', input);

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Emergency plumbing repair',
        }),
      });
    });
  });

  describe('getTransactions', () => {
    it('should get all user transactions', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);

      const result = await TransactionService.getTransactions('user_1', undefined);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('userId', 'user_1');
    });

    it('should filter by portfolio property', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);

      await TransactionService.getTransactions('user_1', 'portfolio_prop_1');

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            portfolioPropertyId: 'portfolio_prop_1',
          }),
        })
      );
    });

    it('should return empty array if no transactions', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await TransactionService.getTransactions('user_1', undefined);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should sort by date descending', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await TransactionService.getTransactions('user_1', undefined);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.any(Object),
        })
      );
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction amount', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'trans_1',
        userId: 'user_1',
      });
      mockPrisma.transaction.update.mockResolvedValue({
        id: 'trans_1',
        amount: 2600,
      });

      const result = await TransactionService.updateTransaction('user_1', 'trans_1', {
        amount: 2600,
      });

      expect(result).toHaveProperty('amount', 2600);
    });

    it('should update transaction description', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'trans_1',
        userId: 'user_1',
      });
      mockPrisma.transaction.update.mockResolvedValue({
        id: 'trans_1',
        description: 'Updated description',
      });

      await TransactionService.updateTransaction('user_1', 'trans_1', {
        description: 'Updated description',
      });

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'trans_1' },
        data: expect.objectContaining({
          description: 'Updated description',
        }),
      });
    });

    it('should throw error if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        TransactionService.updateTransaction('user_1', 'nonexistent', { amount: 2600 })
      ).rejects.toThrow();
    });

    it('should throw error if user does not own transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'trans_1',
        userId: 'different_user',
      });

      await expect(
        TransactionService.updateTransaction('user_1', 'trans_1', { amount: 2600 })
      ).rejects.toThrow();
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'trans_1',
        userId: 'user_1',
      });
      mockPrisma.transaction.delete.mockResolvedValue({ id: 'trans_1' });

      await TransactionService.deleteTransaction('user_1', 'trans_1');

      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'trans_1' },
      });
    });

    it('should throw error if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(TransactionService.deleteTransaction('user_1', 'nonexistent')).rejects.toThrow();
    });

    it('should throw error if user does not own transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        id: 'trans_1',
        userId: 'different_user',
      });

      await expect(TransactionService.deleteTransaction('user_1', 'trans_1')).rejects.toThrow();
    });
  });

  describe('getCategoryTotals', () => {
    it('should return totals by category', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { category: 'rent', amount: 2500 },
        { category: 'rent', amount: 2500 },
        { category: 'maintenance', amount: 500 },
      ]);

      const result = await TransactionService.getCategoryTotals(
        'user_1',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result).toHaveProperty('rent');
      expect(result).toHaveProperty('maintenance');
    });

    it('should calculate total and count for each category', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { category: 'rent', amount: 2500 },
        { category: 'rent', amount: 2500 },
      ]);

      const result = await TransactionService.getCategoryTotals(
        'user_1',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result.rent).toHaveProperty('total', 5000);
      expect(result.rent).toHaveProperty('count', 2);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await TransactionService.getCategoryTotals('user_1', startDate, endDate);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.any(Object),
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      await TransactionService.getCategoryTotals(
        'user_1',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user_1',
          }),
        })
      );
    });

    it('should return empty object if no transactions', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await TransactionService.getCategoryTotals(
        'user_1',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});
