import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyController } from '../propertyController';
import { PropertyService } from '../../services/propertyService';

vi.mock('../../services/propertyService');

describe('PropertyController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {},
      body: {},
      userId: 'user_1',
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('search', () => {
    it('should search with default pagination', async () => {
      await PropertyController.search(mockReq, mockRes, mockNext);

      expect(PropertyService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
        })
      );
    });

    it('should support custom filters', async () => {
      mockReq.query = {
        city: 'Boulder',
        minPrice: '500000',
        maxPrice: '750000',
        page: '2',
        limit: '50',
      };

      await PropertyController.search(mockReq, mockRes, mockNext);

      expect(PropertyService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Boulder',
          minPrice: 500000,
          maxPrice: 750000,
          page: 2,
          limit: 50,
        })
      );
    });

    it('should handle validation errors', async () => {
      mockReq.query = { minPrice: 'invalid' };

      await PropertyController.search(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get property by id', async () => {
      mockReq.params = { id: 'prop_1' };

      await PropertyController.getById(mockReq, mockRes, mockNext);

      expect(PropertyService.getById).toHaveBeenCalledWith('prop_1');
    });
  });

  describe('addToFavorites', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.params = { propertyId: 'prop_1' };

      await PropertyController.addToFavorites(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should add to favorites with notes', async () => {
      mockReq.params = { propertyId: 'prop_1' };
      mockReq.body = { notes: 'Great opportunity' };

      await PropertyController.addToFavorites(mockReq, mockRes, mockNext);

      expect(PropertyService.addToFavorites).toHaveBeenCalledWith('user_1', 'prop_1', 'Great opportunity');
    });

    it('should add to favorites without notes', async () => {
      mockReq.params = { propertyId: 'prop_1' };
      mockReq.body = {};

      await PropertyController.addToFavorites(mockReq, mockRes, mockNext);

      expect(PropertyService.addToFavorites).toHaveBeenCalledWith('user_1', 'prop_1', undefined);
    });
  });

  describe('removeFromFavorites', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.params = { propertyId: 'prop_1' };

      await PropertyController.removeFromFavorites(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should remove from favorites', async () => {
      mockReq.params = { propertyId: 'prop_1' };

      await PropertyController.removeFromFavorites(mockReq, mockRes, mockNext);

      expect(PropertyService.removeFromFavorites).toHaveBeenCalledWith('user_1', 'prop_1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });

  describe('getFavorites', () => {
    it('should require authentication', async () => {
      mockReq.userId = null;

      await PropertyController.getFavorites(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should get favorites with default pagination', async () => {
      mockReq.query = {};

      await PropertyController.getFavorites(mockReq, mockRes, mockNext);

      expect(PropertyService.getFavorites).toHaveBeenCalledWith('user_1', 1, 20);
    });

    it('should support custom pagination', async () => {
      mockReq.query = { page: '3', limit: '50' };

      await PropertyController.getFavorites(mockReq, mockRes, mockNext);

      expect(PropertyService.getFavorites).toHaveBeenCalledWith('user_1', 3, 50);
    });
  });
});
