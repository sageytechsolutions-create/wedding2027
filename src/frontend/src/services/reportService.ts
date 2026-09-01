import { api } from '../lib/api';

export interface ReportResponse {
  success: boolean;
  report: {
    id: string;
    portfolio_id: string;
    report_type: 'summary' | 'full' | 'executive';
    status: string;
    download_url: string;
    expires_at: Date;
    file_size: number;
    generated_at: Date;
  };
}

export interface ReportHistoryItem {
  id: string;
  portfolio_id: string;
  report_type: string;
  file_size: number;
  generated_at: Date;
}

export interface PortfolioSnapshot {
  portfolioId: string;
  userId: string;
  metrics: {
    totalValue: number;
    totalCostBasis: number;
    totalGain: number;
    gainPercentage: number;
    ytdROI: number;
    annualizedReturns: number;
    monthlyCashFlow: number;
    annualCashFlow: number;
    avgCapRate: number;
    avgROI: number;
    propertiesCount: number;
    marketValue: number;
    loanBalance: number;
    equity: number;
  };
  properties: Array<{
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    acquisitionDate: Date;
    acquisitionPrice: number;
    currentValue: number;
    gain: number;
    gainPercentage: number;
    roi: number;
    annualRentIncome: number;
    annualExpenses: number;
    annualNetIncome: number;
    capRate: number;
    loanBalance?: number;
    interestRate?: number;
    monthlyPayment?: number;
  }>;
  generatedAt: Date;
}

export interface PortfolioHealth {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export interface PortfolioTrend {
  date: Date;
  value: number;
  roi: number;
  cashFlow: number;
}

export interface PropertyAggregation {
  propertyId: string;
  percentage: number;
  value: number;
}

export interface CityAggregation {
  city: string;
  count: number;
  value: number;
  percentage: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalCached: number;
}

export interface MemoryUsage {
  used: number;
  peak: number;
  estimated: number;
}

export const reportService = {
  async generateReport(
    portfolioId: string,
    reportType: 'summary' | 'full' | 'executive' = 'summary'
  ): Promise<ReportResponse> {
    return api.post('/api/reports/generate', {
      portfolio_id: portfolioId,
      report_type: reportType,
    });
  },

  async getReportHistory(portfolioId: string, limit: number = 10): Promise<{
    success: boolean;
    portfolio_id: string;
    reports: ReportHistoryItem[];
    count: number;
  }> {
    return api.get(
      `/api/reports/history?portfolio_id=${portfolioId}&limit=${limit}`
    );
  },

  async downloadReport(reportId: string): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reports/${reportId}/download`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    return response.blob();
  },

  async deleteReport(reportId: string): Promise<{ success: boolean }> {
    return api.delete(`/api/reports/${reportId}`);
  },

  async getCacheStatus(): Promise<{
    success: boolean;
    cache_stats: CacheStats;
    memory_usage: MemoryUsage;
  }> {
    return api.get('/api/reports/cache/status');
  },

  async clearCache(): Promise<{ success: boolean; message: string }> {
    return api.delete('/api/reports/cache/clear');
  },

  async getPortfolioSnapshot(portfolioId: string): Promise<{
    success: boolean;
    snapshot: PortfolioSnapshot;
  }> {
    return api.get(`/api/reports/portfolio/${portfolioId}/snapshot`);
  },

  async getPortfolioHealth(portfolioId: string): Promise<{
    success: boolean;
    portfolio_id: string;
    health: PortfolioHealth;
  }> {
    return api.get(`/api/reports/portfolio/${portfolioId}/health`);
  },

  async getPortfolioTrends(
    portfolioId: string,
    months: number = 12
  ): Promise<{
    success: boolean;
    portfolio_id: string;
    trends: PortfolioTrend[];
    period_months: number;
  }> {
    return api.get(
      `/api/reports/portfolio/${portfolioId}/trends?months=${months}`
    );
  },

  async getAggregations(
    portfolioId: string,
    type: 'all' | 'property' | 'city' = 'all'
  ): Promise<{
    success: boolean;
    portfolio_id: string;
    by_property?: PropertyAggregation[];
    by_city?: CityAggregation[];
  }> {
    return api.get(
      `/api/reports/portfolio/${portfolioId}/aggregations?type=${type}`
    );
  },
};
