import { Request, Response, NextFunction } from 'express';
import { PortfolioService } from '../services/portfolioService.js';
import { z } from 'zod';

const addPropertySchema = z.object({
  propertyId: z.string(),
  acquisitionDate: z.string().transform((s) => new Date(s)),
  acquisitionPrice: z.number(),
  downPayment: z.number().optional(),
  loanAmount: z.number().optional(),
  interestRate: z.number().optional(),
  annualPropertyTax: z.number().optional(),
  annualInsurance: z.number().optional(),
  annualMaintenanceEstimate: z.number().optional(),
  notes: z.string().optional(),
});

export class PortfolioController {
  static async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const portfolio = await PortfolioService.getPortfolio(req.userId);
      res.json(portfolio);
    } catch (error) {
      next(error);
    }
  }

  static async getPortfolioSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const summary = await PortfolioService.getPortfolioSummary(req.userId);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }

  static async getPropertyDetails(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const property = await PortfolioService.getPropertyDetails(req.userId, req.params.id);
      res.json(property);
    } catch (error) {
      next(error);
    }
  }

  static async addProperty(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const input = addPropertySchema.parse(req.body);
      const property = await PortfolioService.addProperty(req.userId, input);
      res.status(201).json(property);
    } catch (error) {
      next(error);
    }
  }

  static async updateProperty(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const property = await PortfolioService.updateProperty(req.userId, req.params.id, req.body);
      res.json(property);
    } catch (error) {
      next(error);
    }
  }

  static async removeProperty(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await PortfolioService.removeProperty(req.userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
