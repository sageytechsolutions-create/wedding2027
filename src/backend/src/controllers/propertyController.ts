import { Request, Response, NextFunction } from 'express';
import { PropertyService } from '../services/propertyService.js';
import { z } from 'zod';

const searchSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBeds: z.coerce.number().optional(),
  maxBeds: z.coerce.number().optional(),
  propertyType: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

const favoriteSchema = z.object({
  notes: z.string().optional(),
});

export class PropertyController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const params = searchSchema.parse(req.query);
      const result = await PropertyService.search(params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const property = await PropertyService.getById(req.params.id);
      res.json(property);
    } catch (error) {
      next(error);
    }
  }

  static async addToFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { notes } = favoriteSchema.parse(req.body);
      const favorite = await PropertyService.addToFavorites(
        req.userId,
        req.params.propertyId,
        notes
      );
      res.json(favorite);
    } catch (error) {
      next(error);
    }
  }

  static async removeFromFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await PropertyService.removeFromFavorites(req.userId, req.params.propertyId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await PropertyService.getFavorites(req.userId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
