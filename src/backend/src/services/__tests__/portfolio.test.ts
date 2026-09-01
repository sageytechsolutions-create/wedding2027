import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioService } from '../portfolioService';
import { mockProperty, mockPortfolio } from '../../test/fixtures';

vi.mock('../../config/database', () => ({
  prisma: {
    portfolioProperty: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/database';

describe('PortfolioService', () => {
  const mockPrisma = prisma as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addProperty', () => {
    it('should add property to portfolio', async () => {
      const input = {
        propertyId: 'property_1',
        acquisitionDate: new Date('2022-03-15'),
        acquisitionPrice: 450000,
      };

      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue(null);
      mockPrisma.portfolioProperty.create.mockResolvedValue({
        id: 'portfolio_prop_1',
        ...input,
        userId: 'user_1',
        property: mockProperty,
      });

      const result = await PortfolioService.addProperty('user_1', input);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('propertyId', 'property_1');
      expect(result).toHaveProperty('userId', 'user_1');
    });

    it('should verify property exists', async () => {
      const input = {
        propertyId: 'nonexistent',
        acquisitionDate: new Date(),
        acquisitionPrice: 450000,
      };

      mockPrisma.property.findUnique.mockResolvedValue(null);

      await expect(PortfolioService.addProperty('user_1', input)).rejects.toThrow();
    });

    it('should prevent duplicate properties in portfolio', async () => {
      const input = {
        propertyId: 'property_1',
        acquisitionDate: new Date(),
        acquisitionPrice: 450000,
      };

      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(PortfolioService.addProperty('user_1', input)).rejects.toThrow(
        'Property already in portfolio'
      );
    });

    it('should accept optional loan parameters', async () => {
      const input = {
        propertyId: 'property_1',
        acquisitionDate: new Date(),
        acquisitionPrice: 450000,
        downPayment: 90000,
        loanAmount: 360000,
        interestRate: 6.5,
        annualPropertyTax: 5000,
        annualInsurance: 1200,
        annualMaintenanceEstimate: 3000,
        notes: 'Primary investment',
      };

      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue(null);
      mockPrisma.portfolioProperty.create.mockResolvedValue({
        id: 'portfolio_prop_1',
        ...input,
        userId: 'user_1',
      });

      const result = await PortfolioService.addProperty('user_1', input);

      expect(mockPrisma.portfolioProperty.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          downPayment: 90000,
          loanAmount: 360000,
          interestRate: 6.5,
        }),
        include: { property: true },
      });
    });
  });

  describe('getPortfolio', () => {
    it('should return user portfolio with all properties', async () => {
      mockPrisma.portfolioProperty.findMany.mockResolvedValue([
        {
          id: 'portfolio_prop_1',
          propertyId: 'property_1',
          userId: 'user_1',
          property: mockProperty,
        },
      ]);

      const result = await PortfolioService.getPortfolio('user_1');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('propertyId', 'property_1');
    });

    it('should return empty portfolio if no properties', async () => {
      mockPrisma.portfolioProperty.findMany.mockResolvedValue([]);

      const result = await PortfolioService.getPortfolio('user_1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should filter properties by userId', async () => {
      mockPrisma.portfolioProperty.findMany.mockResolvedValue([]);

      await PortfolioService.getPortfolio('user_1');

      expect(mockPrisma.portfolioProperty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_1' },
        })
      );
    });
  });

  describe('getPortfolioSummary', () => {
    it('should return portfolio summary with metrics', async () => {
      mockPrisma.portfolioProperty.findMany.mockResolvedValue([
        {
          id: 'portfolio_prop_1',
          acquisitionPrice: 450000,
          currentValue: 520000,
          annualRentIncome: 30000,
          annualExpenses: 9000,
          loanBalance: 360000,
          property: mockProperty,
        },
      ]);

      const result = await PortfolioService.getPortfolioSummary('user_1');

      expect(result).toHaveProperty('totalProperties', 1);
      expect(result).toHaveProperty('totalInvestedCapital');
      expect(result).toHaveProperty('totalCurrentValue');
      expect(result).toHaveProperty('totalGain');
      expect(result).toHaveProperty('totalROI');
    });

    it('should calculate metrics correctly', async () => {
      mockPrisma.portfolioProperty.findMany.mockResolvedValue([
        {
          acquisitionPrice: 450000,
          currentValue: 520000,
          annualRentIncome: 30000,
          annualExpenses: 9000,
          loanBalance: 360000,
        },
      ]);

      const result = await PortfolioService.getPortfolioSummary('user_1');

      expect(result.totalInvestedCapital).toBe(450000);
      expect(result.totalCurrentValue).toBe(520000);
      expect(result.totalGain).toBe(70000);
      expect(result.totalROI).toBeGreaterThan(0);
    });
  });

  describe('getPropertyDetails', () => {
    it('should get property details for authenticated user', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue({
        id: 'portfolio_prop_1',
        propertyId: 'property_1',
        userId: 'user_1',
        ...mockProperty,
      });

      const result = await PortfolioService.getPropertyDetails('user_1', 'property_1');

      expect(result).toHaveProperty('propertyId', 'property_1');
    });

    it('should throw error if property not found', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue(null);

      await expect(PortfolioService.getPropertyDetails('user_1', 'nonexistent')).rejects.toThrow();
    });

    it('should throw error if user does not own property', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue(null);

      await expect(PortfolioService.getPropertyDetails('user_1', 'property_1')).rejects.toThrow();
    });
  });

  describe('updateProperty', () => {
    it('should update property details', async () => {
      const updates = {
        currentValue: 550000,
        annualRentIncome: 32000,
      };

      mockPrisma.portfolioProperty.findFirst.mockResolvedValue({
        id: 'portfolio_prop_1',
        userId: 'user_1',
      });
      mockPrisma.portfolioProperty.update.mockResolvedValue({
        id: 'portfolio_prop_1',
        ...updates,
      });

      const result = await PortfolioService.updateProperty('user_1', 'property_1', updates);

      expect(result).toHaveProperty('currentValue', 550000);
    });

    it('should throw error if property not found', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue(null);

      await expect(
        PortfolioService.updateProperty('user_1', 'nonexistent', { currentValue: 550000 })
      ).rejects.toThrow();
    });

    it('should only update provided fields', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue({
        id: 'portfolio_prop_1',
        userId: 'user_1',
      });
      mockPrisma.portfolioProperty.update.mockResolvedValue({
        id: 'portfolio_prop_1',
        currentValue: 550000,
      });

      await PortfolioService.updateProperty('user_1', 'property_1', { currentValue: 550000 });

      expect(mockPrisma.portfolioProperty.update).toHaveBeenCalledWith({
        where: { id: 'portfolio_prop_1' },
        data: { currentValue: 550000 },
      });
    });
  });

  describe('removeProperty', () => {
    it('should remove property from portfolio', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue({
        id: 'portfolio_prop_1',
        userId: 'user_1',
      });
      mockPrisma.portfolioProperty.delete.mockResolvedValue({ id: 'portfolio_prop_1' });

      await PortfolioService.removeProperty('user_1', 'property_1');

      expect(mockPrisma.portfolioProperty.delete).toHaveBeenCalledWith({
        where: { id: 'portfolio_prop_1' },
      });
    });

    it('should throw error if property not found', async () => {
      mockPrisma.portfolioProperty.findFirst.mockResolvedValue(null);

      await expect(PortfolioService.removeProperty('user_1', 'nonexistent')).rejects.toThrow();
    });
  });
});
