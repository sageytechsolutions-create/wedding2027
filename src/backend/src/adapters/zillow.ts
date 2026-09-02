import axios from 'axios';
import { z } from 'zod';

const PropertyDataSchema = z.object({
  id: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family', 'land']),
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.number(),
  lotSize: z.number(),
  yearBuilt: z.number(),
  listPrice: z.number(),
  pricePerSqft: z.number(),
  daysOnMarket: z.number().optional(),
  imageUrl: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  listingDate: z.string(),
  zpid: z.string().optional(),
});

export type PropertyData = z.infer<typeof PropertyDataSchema>;

interface ZillowSearchParams {
  location: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
}

export class ZillowAdapter {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, PropertyData[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ZILLOW_API_KEY || 'demo';
    this.baseUrl = 'https://zillow-api.p.rapidapi.com';
  }

  /**
   * Search for properties by location
   * Falls back to mock data if API is unavailable
   */
  async searchProperties(params: ZillowSearchParams): Promise<PropertyData[]> {
    const cacheKey = JSON.stringify(params);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      if (this.apiKey === 'demo') {
        return this.getMockProperties(params);
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          location: params.location,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          propertyType: params.propertyType,
          bedrooms: params.bedrooms,
          bathrooms: params.bathrooms,
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'zillow-api.p.rapidapi.com',
        },
      });

      const properties = response.data.results || [];
      const validated = properties.map((p: any) => this.normalizeProperty(p));
      this.setCache(cacheKey, validated);
      return validated;
    } catch (error) {
      console.error('Zillow API error:', error);
      return this.getMockProperties(params);
    }
  }

  /**
   * Get comparable properties for a given property
   */
  async getComparables(
    address: string,
    radius: number = 0.5
  ): Promise<PropertyData[]> {
    try {
      if (this.apiKey === 'demo') {
        return this.getMockComparables(address, radius);
      }

      const response = await axios.get(`${this.baseUrl}/comparables`, {
        params: {
          address,
          radius,
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'zillow-api.p.rapidapi.com',
        },
      });

      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching comparables:', error);
      return [];
    }
  }

  /**
   * Get property details by ZPID
   */
  async getPropertyDetails(zpid: string): Promise<PropertyData | null> {
    try {
      if (this.apiKey === 'demo') {
        return this.getMockPropertyDetail(zpid);
      }

      const response = await axios.get(`${this.baseUrl}/property/${zpid}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'zillow-api.p.rapidapi.com',
        },
      });

      return this.normalizeProperty(response.data);
    } catch (error) {
      console.error('Error fetching property details:', error);
      return null;
    }
  }

  /**
   * Get market statistics for a location
   */
  async getMarketStats(
    city: string,
    state: string
  ): Promise<{
    avgPrice: number;
    medianPrice: number;
    pricePerSqft: number;
    inventory: number;
    daysOnMarket: number;
    priceChange: number;
  } | null> {
    try {
      if (this.apiKey === 'demo') {
        return this.getMockMarketStats(city, state);
      }

      const response = await axios.get(`${this.baseUrl}/market`, {
        params: {
          city,
          state,
        },
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'zillow-api.p.rapidapi.com',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching market stats:', error);
      return null;
    }
  }

  private normalizeProperty(raw: any): PropertyData {
    return {
      id: raw.id || raw.zpid,
      address: raw.address || `${raw.streetAddress}`,
      city: raw.city,
      state: raw.state,
      zipCode: raw.zipCode,
      propertyType: raw.propertyType || 'single_family',
      bedrooms: raw.bedrooms || 0,
      bathrooms: raw.bathrooms || 0,
      squareFeet: raw.squareFeet || raw.livingAreaSqFt || 0,
      lotSize: raw.lotSize || 0,
      yearBuilt: raw.yearBuilt || 2000,
      listPrice: raw.listPrice || raw.price || 0,
      pricePerSqft: raw.pricePerSqft || 0,
      daysOnMarket: raw.daysOnMarket,
      imageUrl: raw.imageUrl || raw.imageSrc,
      latitude: raw.latitude || 0,
      longitude: raw.longitude || 0,
      listingDate: raw.listingDate || new Date().toISOString(),
      zpid: raw.zpid,
    };
  }

  private getMockProperties(params: ZillowSearchParams): PropertyData[] {
    const mockListings: PropertyData[] = [
      {
        id: 'mock_1',
        address: '456 Main St',
        city: params.location.split(',')[0] || 'Denver',
        state: 'CO',
        zipCode: '80202',
        propertyType: 'single_family',
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2500,
        lotSize: 7500,
        yearBuilt: 2010,
        listPrice: 625000,
        pricePerSqft: 250,
        daysOnMarket: 12,
        latitude: 39.7392,
        longitude: -104.9903,
        listingDate: new Date().toISOString(),
        zpid: 'mock_1',
      },
      {
        id: 'mock_2',
        address: '789 Oak Ave',
        city: params.location.split(',')[0] || 'Denver',
        state: 'CO',
        zipCode: '80205',
        propertyType: 'townhouse',
        bedrooms: 3,
        bathrooms: 2.5,
        squareFeet: 1800,
        lotSize: 3000,
        yearBuilt: 2015,
        listPrice: 550000,
        pricePerSqft: 305,
        daysOnMarket: 8,
        latitude: 39.7500,
        longitude: -104.9800,
        listingDate: new Date().toISOString(),
        zpid: 'mock_2',
      },
      {
        id: 'mock_3',
        address: '321 Pine Rd',
        city: params.location.split(',')[0] || 'Denver',
        state: 'CO',
        zipCode: '80204',
        propertyType: 'condo',
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 1200,
        lotSize: 1200,
        yearBuilt: 2018,
        listPrice: 425000,
        pricePerSqft: 354,
        daysOnMarket: 5,
        latitude: 39.7250,
        longitude: -105.0000,
        listingDate: new Date().toISOString(),
        zpid: 'mock_3',
      },
    ];

    return mockListings.filter((p) => {
      if (params.minPrice && p.listPrice < params.minPrice) return false;
      if (params.maxPrice && p.listPrice > params.maxPrice) return false;
      if (params.bedrooms && p.bedrooms < params.bedrooms) return false;
      if (params.bathrooms && p.bathrooms < params.bathrooms) return false;
      if (params.propertyType && p.propertyType !== params.propertyType)
        return false;
      return true;
    });
  }

  private getMockComparables(address: string, radius: number): PropertyData[] {
    return this.getMockProperties({ location: 'Denver, CO' }).slice(0, 3);
  }

  private getMockPropertyDetail(zpid: string): PropertyData | null {
    const mockProperties = this.getMockProperties({ location: 'Denver, CO' });
    return mockProperties.find((p) => p.zpid === zpid) || null;
  }

  private getMockMarketStats(city: string, state: string) {
    return {
      avgPrice: 525000,
      medianPrice: 500000,
      pricePerSqft: 280,
      inventory: 145,
      daysOnMarket: 18,
      priceChange: 3.2,
    };
  }

  private getFromCache(key: string): PropertyData[] | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      return null;
    }
    return this.cache.get(key) || null;
  }

  private setCache(key: string, data: PropertyData[]): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
