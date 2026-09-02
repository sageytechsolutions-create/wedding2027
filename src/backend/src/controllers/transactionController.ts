import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService.js';
import { z } from 'zod';

const createTransactionSchema = z.object({
  portfolioPropertyId: z.string(),
  transactionType: z.enum(['income', 'expense', 'mortgage']),
  category: z.string(),
  amount: z.number().positive(),
  date: z.string().transform((s) => new Date(s)),
  description: z.string().optional(),
});

export class TransactionController {
  static async addTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const input = createTransactionSchema.parse(req.body);
      const transaction = await TransactionService.addTransaction(req.userId, input);
      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const portfolioPropertyId = req.query.portfolioPropertyId as string | undefined;
      const transactions = await TransactionService.getTransactions(req.userId, portfolioPropertyId);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  }

  static async updateTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const transaction = await TransactionService.updateTransaction(
        req.userId,
        req.params.id,
        req.body
      );
      res.json(transaction);
    } catch (error) {
      next(error);
    }
  }

  static async deleteTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await TransactionService.deleteTransaction(req.userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryTotals(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Invalid date range' });
        return;
      }

      const totals = await TransactionService.getCategoryTotals(req.userId, startDate, endDate);
      res.json(totals);
    } catch (error) {
      next(error);
    }
  }
}
