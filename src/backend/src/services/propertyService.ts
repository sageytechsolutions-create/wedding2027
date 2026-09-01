import { prisma } from '../config/database.js';
import { Errors } from '../utils/errors.js';

export interface PropertySearchParams {
  city?: string;
  state?: string;
  zipCode?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  propertyType?: string;
  page?: number;
  limit?: number;
}

export class PropertyService {
  static async search(params: PropertySearchParams) {
    const limit = Math.min(params.limit || 20, 100);
    const page = params.page || 1;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
    if (params.state) where.state = { contains: params.state, mode: 'insensitive' };
    if (params.zipCode) where.zipCode = params.zipCode;
    if (params.propertyType) where.propertyType = params.propertyType;
    if (params.minBeds) where.bedrooms = { gte: params.minBeds };
    if (params.maxBeds) where.bedrooms = { ...where.bedrooms, lte: params.maxBeds };

    if (params.minPrice || params.maxPrice) {
      where.estimatedValue = {};
      if (params.minPrice) where.estimatedValue.gte = params.minPrice;
      if (params.maxPrice) where.estimatedValue.lte = params.maxPrice;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.property.count({ where }),
    ]);

    return {
      data: properties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw Errors.propertyNotFound(id);
    }

    return property;
  }

  static async create(data: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    lotSize?: number;
    yearBuilt?: number;
    listPrice?: number;
    estimatedValue?: number;
    propertyImageUrl?: string;
  }) {
    return prisma.property.create({
      data,
    });
  }

  static async addToFavorites(userId: string, propertyId: string, notes?: string) {
    await this.getById(propertyId);

    return prisma.favorite.upsert({
      where: {
        userId_propertyId: { userId, propertyId },
      },
      update: { notes },
      create: { userId, propertyId, notes },
    });
  }

  static async removeFromFavorites(userId: string, propertyId: string) {
    await prisma.favorite.deleteMany({
      where: { userId, propertyId },
    });
  }

  static async getFavorites(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: { property: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      data: favorites,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
