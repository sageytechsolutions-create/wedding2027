import { create } from 'zustand';
import { api } from '../lib/api';

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  listPrice?: number;
  estimatedValue?: number;
  propertyImageUrl?: string;
}

interface PropertySearch {
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

interface SearchResult {
  data: Property[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface PropertyStore {
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  pagination: SearchResult['pagination'] | null;
  search: (params: PropertySearch) => Promise<void>;
  getById: (id: string) => Promise<Property>;
  addToFavorites: (propertyId: string, notes?: string) => Promise<void>;
  removeFromFavorites: (propertyId: string) => Promise<void>;
}

export const usePropertyStore = create<PropertyStore>((set) => ({
  properties: [],
  isLoading: false,
  error: null,
  pagination: null,

  search: async (params: PropertySearch) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });

      const result = await api.get<SearchResult>(`/api/properties?${query}`);
      set({
        properties: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Search failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  getById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      return await api.get<Property>(`/api/properties/${id}`);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch property' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addToFavorites: async (propertyId: string, notes?: string) => {
    try {
      await api.post(`/api/properties/${propertyId}/favorites`, { notes });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add to favorites' });
      throw error;
    }
  },

  removeFromFavorites: async (propertyId: string) => {
    try {
      await api.delete(`/api/properties/${propertyId}/favorites`);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove from favorites' });
      throw error;
    }
  },
}));
