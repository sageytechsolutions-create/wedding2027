import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionController } from '../transactionController';
import { TransactionService } from '../../services/transactionService';

vi.mock('../../services/transactionService');

describe('TransactionController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      userId: 'user_1',
      query: {},
      params: {},
      body: {},
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('addTransaction', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.body = {
        portfolioPropertyId: 'prop_1',
        transactionType: 'income',
        category: 'rent',
        amount: 2500,
        date: '2024-01-15',
      };

      await TransactionController.addTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should create transaction with valid data', async () => {
      mockReq.body = {
        portfolioPropertyId: 'prop_1',
        transactionType: 'income',
        category: 'rent',
        amount: 2500,
        date: '2024-01-15',
        description: 'Monthly rent',
      };

      await TransactionController.addTransaction(mockReq, mockRes, mockNext);

      expect(TransactionService.addTransaction).toHaveBeenCalledWith(
        'user_1',
        expect.objectContaining({
          transactionType: 'income',
          amount: 2500,
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should validate transaction type enum', async () => {
      mockReq.body = {
        portfolioPropertyId: 'prop_1',
        transactionType: 'invalid',
        category: 'rent',
        amount: 2500,
        date: '2024-01-15',
      };

      await TransactionController.addTransaction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate amount is positive', async () => {
      mockReq.body = {
        portfolioPropertyId: 'prop_1',
        transactionType: 'income',
        category: 'rent',
        amount: -100,
        date: '2024-01-15',
      };

      await TransactionController.addTransaction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;

      await TransactionController.getTransactions(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should get all user transactions', async () => {
      mockReq.query = {};

      await TransactionController.getTransactions(mockReq, mockRes, mockNext);

      expect(TransactionService.getTransactions).toHaveBeenCalledWith('user_1', undefined);
    });

    it('should filter by portfolio property', async () => {
      mockReq.query = { portfolioPropertyId: 'prop_1' };

      await TransactionController.getTransactions(mockReq, mockRes, mockNext);

      expect(TransactionService.getTransactions).toHaveBeenCalledWith('user_1', 'prop_1');
    });
  });

  describe('updateTransaction', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.params = { id: 'trans_1' };

      await TransactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should update transaction', async () => {
      mockReq.params = { id: 'trans_1' };
      mockReq.body = { amount: 2600 };

      await TransactionController.updateTransaction(mockReq, mockRes, mockNext);

      expect(TransactionService.updateTransaction).toHaveBeenCalledWith('user_1', 'trans_1', { amount: 2600 });
    });
  });

  describe('deleteTransaction', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.params = { id: 'trans_1' };

      await TransactionController.deleteTransaction(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should delete transaction and return 204', async () => {
      mockReq.params = { id: 'trans_1' };

      await TransactionController.deleteTransaction(mockReq, mockRes, mockNext);

      expect(TransactionService.deleteTransaction).toHaveBeenCalledWith('user_1', 'trans_1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });

  describe('getCategoryTotals', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      await TransactionController.getCategoryTotals(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should get totals for date range', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      await TransactionController.getCategoryTotals(mockReq, mockRes, mockNext);

      expect(TransactionService.getCategoryTotals).toHaveBeenCalledWith(
        'user_1',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should validate date format', async () => {
      mockReq.query = {
        startDate: 'invalid',
        endDate: '2024-12-31',
      };

      await TransactionController.getCategoryTotals(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should validate both dates required', async () => {
      mockReq.query = { startDate: '2024-01-01' };

      await TransactionController.getCategoryTotals(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
