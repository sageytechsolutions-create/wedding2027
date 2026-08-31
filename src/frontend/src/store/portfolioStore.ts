import { create } from 'zustand';
import { api } from '../lib/api';
import { Property } from './propertyStore';

export interface PortfolioProperty {
  id: string;
  property: Property;
  acquisitionDate: string;
  acquisitionPrice: number;
  downPayment?: number;
  loanAmount?: number;
  interestRate?: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
  annualMaintenanceEstimate?: number;
  notes?: string;
}

export interface PortfolioSummary {
  propertyCount: number;
  totalInvestedCapital: number;
  totalCurrentValue: number;
  totalAppreciation: number;
  roi: number;
  totalAnnualExpenses: number;
}

interface PortfolioStore {
  properties: PortfolioProperty[];
  summary: PortfolioSummary | null;
  isLoading: boolean;
  error: string | null;
  fetchPortfolio: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  addProperty: (data: any) => Promise<void>;
  updateProperty: (id: string, data: any) => Promise<void>;
  removeProperty: (id: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  properties: [],
  summary: null,
  isLoading: false,
  error: null,

  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.get<PortfolioProperty[]>('/api/portfolio');
      set({ properties: result });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch portfolio' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.get<PortfolioSummary>('/api/portfolio/summary');
      set({ summary: result });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch summary' });
    } finally {
      set({ isLoading: false });
    }
  },

  addProperty: async (data: any) => {
    try {
      await api.post('/api/portfolio', data);
      await get().fetchPortfolio();
      await get().fetchSummary();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add property' });
      throw error;
    }
  },

  updateProperty: async (id: string, data: any) => {
    try {
      await api.patch(`/api/portfolio/${id}`, data);
      await get().fetchPortfolio();
      await get().fetchSummary();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update property' });
      throw error;
    }
  },

  removeProperty: async (id: string) => {
    try {
      await api.delete(`/api/portfolio/${id}`);
      await get().fetchPortfolio();
      await get().fetchSummary();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove property' });
      throw error;
    }
  },
}));
