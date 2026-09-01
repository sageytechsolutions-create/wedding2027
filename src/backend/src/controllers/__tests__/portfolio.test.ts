import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioController } from '../portfolioController';
import { PortfolioService } from '../../services/portfolioService';
import { mockPortfolio, mockProperty, mockPortfolioSnapshot, mockPortfolioHealth } from '../../test/fixtures';

vi.mock('../../services/portfolioService');

describe('PortfolioController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      userId: 'user_1',
      params: {},
      body: {},
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('getPortfolio', () => {
    it('should return portfolio for authenticated user', async () => {
      vi.mocked(PortfolioService.getPortfolio).mockResolvedValue(mockPortfolio as any);

      await PortfolioController.getPortfolio(mockReq, mockRes, mockNext);

      expect(PortfolioService.getPortfolio).toHaveBeenCalledWith('user_1');
      expect(mockRes.json).toHaveBeenCalledWith(mockPortfolio);
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.userId = null;

      await PortfolioController.getPortfolio(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should call next with error on service failure', async () => {
      const error = new Error('Database error');
      vi.mocked(PortfolioService.getPortfolio).mockRejectedValue(error);

      await PortfolioController.getPortfolio(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary', async () => {
      vi.mocked(PortfolioService.getPortfolioSummary).mockResolvedValue(mockPortfolioSnapshot as any);

      await PortfolioController.getPortfolioSummary(mockReq, mockRes, mockNext);

      expect(PortfolioService.getPortfolioSummary).toHaveBeenCalledWith('user_1');
      expect(mockRes.json).toHaveBeenCalledWith(mockPortfolioSnapshot);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.userId = null;

      await PortfolioController.getPortfolioSummary(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getPropertyDetails', () => {
    it('should return property details', async () => {
      mockReq.params.id = 'property_1';
      vi.mocked(PortfolioService.getPropertyDetails).mockResolvedValue(mockProperty as any);

      await PortfolioController.getPropertyDetails(mockReq, mockRes, mockNext);

      expect(PortfolioService.getPropertyDetails).toHaveBeenCalledWith('user_1', 'property_1');
      expect(mockRes.json).toHaveBeenCalledWith(mockProperty);
    });

    it('should require authentication', async () => {
      mockReq.userId = null;
      mockReq.params.id = 'property_1';

      await PortfolioController.getPropertyDetails(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('addProperty', () => {
    it('should add property with valid data', async () => {
      mockReq.body = {
        propertyId: 'property_1',
        acquisitionDate: '2022-03-15',
        acquisitionPrice: 450000,
      };

      vi.mocked(PortfolioService.addProperty).mockResolvedValue(mockProperty as any);

      await PortfolioController.addProperty(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockProperty);
    });

    it('should add property with optional fields', async () => {
      mockReq.body = {
        propertyId: 'property_2',
        acquisitionDate: '2023-06-01',
        acquisitionPrice: 550000,
        downPayment: 110000,
        loanAmount: 440000,
        interestRate: 7.2,
        annualPropertyTax: 6000,
        annualInsurance: 1200,
        annualMaintenanceEstimate: 4000,
        notes: 'Investment property in Denver',
      };

      vi.mocked(PortfolioService.addProperty).mockResolvedValue(mockProperty as any);

      await PortfolioController.addProperty(mockReq, mockRes, mockNext);

      expect(PortfolioService.addProperty).toHaveBeenCalledWith('user_1', expect.objectContaining({
        propertyId: 'property_2',
        acquisitionPrice: 550000,
      }));
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.userId = null;
      mockReq.body = {
        propertyId: 'property_1',
        acquisitionDate: '2022-03-15',
        acquisitionPrice: 450000,
      };

      await PortfolioController.addProperty(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should validate required fields', async () => {
      mockReq.body = {
        // Missing required fields
        acquisitionPrice: 450000,
      };

      await PortfolioController.addProperty(mockReq, mockRes, mockNext);

      // Should call next with validation error
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate acquisition date format', async () => {
      mockReq.body = {
        propertyId: 'property_1',
        acquisitionDate: 'invalid-date',
        acquisitionPrice: 450000,
      };

      await PortfolioController.addProperty(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockReq.body = {
        propertyId: 'property_1',
        acquisitionDate: '2022-03-15',
        acquisitionPrice: 450000,
      };

      vi.mocked(PortfolioService.addProperty).mockRejectedValue(error);

      await PortfolioController.addProperty(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateProperty', () => {
    it('should update property with valid data', async () => {
      mockReq.params.id = 'property_1';
      mockReq.body = {
        acquisitionPrice: 480000,
        annualRentIncome: 35000,
      };

      vi.mocked(PortfolioService.updateProperty).mockResolvedValue(mockProperty as any);

      await PortfolioController.updateProperty(mockReq, mockRes, mockNext);

      expect(PortfolioService.updateProperty).toHaveBeenCalledWith('user_1', 'property_1', mockReq.body);
      expect(mockRes.json).toHaveBeenCalledWith(mockProperty);
    });

    it('should support partial updates', async () => {
      mockReq.params.id = 'property_1';
      mockReq.body = {
        currentValue: 550000,
      };

      vi.mocked(PortfolioService.updateProperty).mockResolvedValue(mockProperty as any);

      await PortfolioController.updateProperty(mockReq, mockRes, mockNext);

      expect(PortfolioService.updateProperty).toHaveBeenCalledWith('user_1', 'property_1', { currentValue: 550000 });
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.userId = null;
      mockReq.params.id = 'property_1';
      mockReq.body = { currentValue: 550000 };

      await PortfolioController.updateProperty(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle service errors', async () => {
      const error = new Error('Property not found');
      mockReq.params.id = 'property_1';
      mockReq.body = { currentValue: 550000 };

      vi.mocked(PortfolioService.updateProperty).mockRejectedValue(error);

      await PortfolioController.updateProperty(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('removeProperty', () => {
    it('should delete property and return 204', async () => {
      mockReq.params.id = 'property_1';
      mockRes.send = vi.fn().mockReturnThis();

      vi.mocked(PortfolioService.removeProperty).mockResolvedValue(undefined);

      await PortfolioController.removeProperty(mockReq, mockRes, mockNext);

      expect(PortfolioService.removeProperty).toHaveBeenCalledWith('user_1', 'property_1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.userId = null;
      mockReq.params.id = 'property_1';

      await PortfolioController.removeProperty(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle service errors', async () => {
      const error = new Error('Property not found');
      mockReq.params.id = 'property_1';

      vi.mocked(PortfolioService.removeProperty).mockRejectedValue(error);

      await PortfolioController.removeProperty(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

describe('PortfolioController Data Contracts', () => {
  it('portfolio should have all required fields', () => {
    expect(mockPortfolio).toHaveProperty('id');
    expect(mockPortfolio).toHaveProperty('userId');
    expect(mockPortfolio).toHaveProperty('name');
    expect(mockPortfolio).toHaveProperty('createdAt');
    expect(mockPortfolio).toHaveProperty('updatedAt');
  });

  it('portfolio summary should include financial metrics', () => {
    expect(mockPortfolioSnapshot).toHaveProperty('totalProperties');
    expect(mockPortfolioSnapshot).toHaveProperty('totalInvestedCapital');
    expect(mockPortfolioSnapshot).toHaveProperty('totalCurrentValue');
    expect(mockPortfolioSnapshot).toHaveProperty('totalGain');
    expect(mockPortfolioSnapshot).toHaveProperty('totalROI');
  });

  it('property should include all financial details', () => {
    expect(mockProperty).toHaveProperty('propertyType');
    expect(mockProperty).toHaveProperty('acquisitionPrice');
    expect(mockProperty).toHaveProperty('currentValue');
    expect(mockProperty).toHaveProperty('annualRentIncome');
    expect(mockProperty).toHaveProperty('loanBalance');
  });
});
