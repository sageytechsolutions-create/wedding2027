import { PrismaClient } from '@prisma/client';
import { ZillowAdapter, PropertyData } from '../adapters/zillow';

interface SyncResult {
  added: number;
  updated: number;
  duplicates: number;
  errors: number;
  timestamp: Date;
}

export class PropertySyncService {
  private prisma: PrismaClient;
  private zillow: ZillowAdapter;

  constructor(prisma: PrismaClient, zillow?: ZillowAdapter) {
    this.prisma = prisma;
    this.zillow = zillow || new ZillowAdapter();
  }

  /**
   * Sync properties from Zillow for a specific location
   */
  async syncPropertiesByLocation(
    city: string,
    state: string,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      bedrooms?: number;
      bathrooms?: number;
    }
  ): Promise<SyncResult> {
    const result: SyncResult = {
      added: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
      timestamp: new Date(),
    };

    try {
      const location = `${city}, ${state}`;
      const properties = await this.zillow.searchProperties({
        location,
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
        bedrooms: filters?.bedrooms,
        bathrooms: filters?.bathrooms,
      });

      for (const prop of properties) {
        try {
          await this.syncProperty(prop);
          result.added++;
        } catch (error) {
          if (error instanceof Error && error.message.includes('duplicate')) {
            result.duplicates++;
          } else {
            result.errors++;
            console.error(`Error syncing property ${prop.id}:`, error);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Sync error:', error);
      result.errors++;
      return result;
    }
  }

  /**
   * Sync a single property
   */
  async syncProperty(propertyData: PropertyData) {
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        OR: [
          { externalId: propertyData.id },
          { externalId: propertyData.zpid },
          {
            AND: [
              { address: propertyData.address },
              { city: propertyData.city },
              { state: propertyData.state },
            ],
          },
        ],
      },
    });

    if (existingProperty) {
      // Update existing property
      await this.prisma.property.update({
        where: { id: existingProperty.id },
        data: {
          listPrice: propertyData.listPrice,
          estimatedValue: propertyData.listPrice,
          propertyDetails: {
            pricePerSqft: propertyData.pricePerSqft,
            daysOnMarket: propertyData.daysOnMarket,
            listingDate: propertyData.listingDate,
          },
        },
      });

      throw new Error('Property already exists (duplicate)');
    }

    // Create new property
    await this.prisma.property.create({
      data: {
        externalId: propertyData.zpid || propertyData.id,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zipCode: propertyData.zipCode,
        lat: propertyData.latitude,
        lng: propertyData.longitude,
        propertyType: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        squareFeet: propertyData.squareFeet,
        lotSize: propertyData.lotSize,
        yearBuilt: propertyData.yearBuilt,
        listPrice: propertyData.listPrice,
        estimatedValue: propertyData.listPrice,
        propertyImageUrl: propertyData.imageUrl,
        propertyDetails: {
          pricePerSqft: propertyData.pricePerSqft,
          daysOnMarket: propertyData.daysOnMarket,
          listingDate: propertyData.listingDate,
        },
      },
    });
  }

  /**
   * Clean up inactive listings (older than 90 days)
   */
  async cleanupInactiveListings(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.property.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    return result.count;
  }

  /**
   * Update property valuations based on latest market data
   */
  async updatePropertyValuations(city: string, state: string): Promise<number> {
    const properties = await this.prisma.property.findMany({
      where: {
        city,
        state,
      },
    });

    let updated = 0;

    for (const prop of properties) {
      try {
        // Get market stats and recalculate estimated value
        const marketStats = await this.zillow.getMarketStats(city, state);
        if (marketStats) {
          const estimatedValue =
            (prop.squareFeet || 0) * marketStats.pricePerSqft +
            ((prop.bedrooms || 0) * 50000 + (prop.bathrooms || 0) * 30000);

          await this.prisma.property.update({
            where: { id: prop.id },
            data: {
              estimatedValue,
              propertyDetails: {
                ...((prop.propertyDetails as any) || {}),
                lastValuationUpdate: new Date().toISOString(),
              },
            },
          });

          updated++;
        }
      } catch (error) {
        console.error(`Error updating valuation for property ${prop.id}:`, error);
      }
    }

    return updated;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalProperties: number;
    propertiesByCity: Record<string, number>;
    lastSyncDate: Date | null;
  }> {
    const totalProperties = await this.prisma.property.count();

    const propertiesByCity = await this.prisma.property.groupBy({
      by: ['city'],
      _count: true,
    });

    const lastProperty = await this.prisma.property.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const cityStats: Record<string, number> = {};
    propertiesByCity.forEach((item) => {
      cityStats[item.city] = item._count;
    });

    return {
      totalProperties,
      propertiesByCity: cityStats,
      lastSyncDate: lastProperty?.createdAt || null,
    };
  }
}
