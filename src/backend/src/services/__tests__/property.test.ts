import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyService } from '../propertyService';
import { mockSearchProperty } from '../../test/fixtures';

vi.mock('../../config/database', () => ({
  prisma: {
    property: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    favorite: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/database';

describe('PropertyService', () => {
  const mockPrisma = prisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should search properties with filters', async () => {
      const params = {
        city: 'Boulder',
        minPrice: 500000,
        maxPrice: 750000,
        page: 1,
        limit: 20,
      };

      mockPrisma.property.findMany.mockResolvedValue([mockSearchProperty]);

      const result = await PropertyService.search(params);

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
    });

    it('should apply pagination', async () => {
      const params = {
        page: 2,
        limit: 10,
      };

      mockPrisma.property.findMany.mockResolvedValue([]);

      await PropertyService.search(params);

      expect(mockPrisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it('should filter by price range', async () => {
      const params = {
        minPrice: 400000,
        maxPrice: 600000,
        page: 1,
        limit: 20,
      };

      mockPrisma.property.findMany.mockResolvedValue([]);

      await PropertyService.search(params);

      expect(mockPrisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: expect.any(Object),
          }),
        })
      );
    });

    it('should filter by location', async () => {
      const params = {
        city: 'Denver',
        state: 'CO',
        page: 1,
        limit: 20,
      };

      mockPrisma.property.findMany.mockResolvedValue([]);

      await PropertyService.search(params);

      expect(mockPrisma.property.findMany).toHaveBeenCalled();
    });

    it('should filter by bedrooms', async () => {
      const params = {
        minBeds: 3,
        maxBeds: 5,
        page: 1,
        limit: 20,
      };

      mockPrisma.property.findMany.mockResolvedValue([]);

      await PropertyService.search(params);

      expect(mockPrisma.property.findMany).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get property by id', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockSearchProperty);

      const result = await PropertyService.getById('prop_2');

      expect(result).toHaveProperty('id', 'prop_2');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('price');
    });

    it('should throw error if property not found', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(PropertyService.getById('nonexistent')).rejects.toThrow();
    });
  });

  describe('addToFavorites', () => {
    it('should add property to user favorites', async () => {
      mockPrisma.favorite.create.mockResolvedValue({
        id: 'fav_1',
        userId: 'user_1',
        propertyId: 'prop_2',
        notes: 'Great opportunity',
      });

      const result = await PropertyService.addToFavorites('user_1', 'prop_2', 'Great opportunity');

      expect(result).toHaveProperty('userId', 'user_1');
      expect(result).toHaveProperty('propertyId', 'prop_2');
    });

    it('should add to favorites without notes', async () => {
      mockPrisma.favorite.create.mockResolvedValue({
        id: 'fav_1',
        userId: 'user_1',
        propertyId: 'prop_2',
        notes: null,
      });

      const result = await PropertyService.addToFavorites('user_1', 'prop_2', undefined);

      expect(mockPrisma.favorite.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_1',
          propertyId: 'prop_2',
          notes: undefined,
        },
      });
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove property from favorites', async () => {
      mockPrisma.favorite.delete.mockResolvedValue({ id: 'fav_1' });

      await PropertyService.removeFromFavorites('user_1', 'prop_2');

      expect(mockPrisma.favorite.delete).toHaveBeenCalledWith({
        where: {
          userId_propertyId: {
            userId: 'user_1',
            propertyId: 'prop_2',
          },
        },
      });
    });

    it('should throw error if favorite not found', async () => {
      mockPrisma.favorite.delete.mockRejectedValue(new Error('Not found'));

      await expect(PropertyService.removeFromFavorites('user_1', 'nonexistent')).rejects.toThrow();
    });
  });

  describe('getFavorites', () => {
    it('should get user favorites with pagination', async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([
        {
          id: 'fav_1',
          propertyId: 'prop_2',
          userId: 'user_1',
          notes: 'Good investment',
        },
      ]);

      const result = await PropertyService.getFavorites('user_1', 1, 20);

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
    });

    it('should apply pagination correctly', async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([]);

      await PropertyService.getFavorites('user_1', 2, 50);

      expect(mockPrisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([]);

      await PropertyService.getFavorites('user_1', 1, 20);

      expect(mockPrisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_1' },
        })
      );
    });
  });
});
