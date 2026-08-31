import { api } from '../lib/api';

export interface CustomMetric {
  id: string;
  user_id: string;
  portfolio_id?: string;
  name: string;
  description?: string;
  formula_type: 'sum' | 'average' | 'ratio' | 'formula';
  formula_config: Record<string, any>;
  display_format: 'percentage' | 'currency' | 'number';
  threshold_alert?: number;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MetricCalculation {
  id: string;
  metric_id: string;
  calculated_value: number;
  portfolio_snapshot?: Record<string, any>;
  calculation_time: number;
  alert_triggered: boolean;
  created_at: Date;
}

export interface MetricAlert {
  id: string;
  metric_id: string;
  user_id: string;
  threshold_value?: number;
  current_value?: number;
  breach_direction?: 'above' | 'below';
  is_active: boolean;
  acknowledged_at?: Date;
  created_at: Date;
}

export interface AvailableMetric {
  id: string;
  name: string;
  description: string;
  formula_type: string;
  display_format: string;
  category: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

export const metricsService = {
  async getAvailableMetrics(): Promise<{
    success: boolean;
    metrics: AvailableMetric[];
  }> {
    return api.get('/api/metrics/available');
  },

  async calculateMetric(data: {
    metric_id?: string;
    portfolio_id: string;
    name?: string;
    formula_type: 'sum' | 'average' | 'ratio' | 'formula';
    formula_config: Record<string, any>;
    display_format: 'percentage' | 'currency' | 'number';
  }): Promise<{
    success: boolean;
    metric: CustomMetric;
    calculation: MetricCalculation;
    value: number;
  }> {
    return api.post('/api/metrics/calculate', data);
  },

  async validateFormula(data: {
    formula_type: 'sum' | 'average' | 'ratio' | 'formula';
    formula_config: Record<string, any>;
    portfolio_id?: string;
  }): Promise<ValidationResult> {
    return api.post('/api/metrics/validate-formula', data);
  },

  async getMetricHistory(
    metricId: string,
    limit: number = 50
  ): Promise<{
    success: boolean;
    metric_id: string;
    calculations: MetricCalculation[];
    count: number;
  }> {
    return api.get(
      `/api/metrics/history/${metricId}?limit=${limit}`
    );
  },

  async createAlert(data: {
    metric_id: string;
    portfolio_id?: string;
    threshold_value?: number;
    breach_direction?: 'above' | 'below';
  }): Promise<{
    success: boolean;
    alert: MetricAlert;
  }> {
    return api.post('/api/metrics/alerts', data);
  },

  async getAlerts(): Promise<{
    success: boolean;
    alerts: MetricAlert[];
    active_count: number;
  }> {
    return api.get('/api/metrics/alerts');
  },

  async acknowledgeAlert(alertId: string): Promise<{
    success: boolean;
    alert: MetricAlert;
  }> {
    return api.put<{
      success: boolean;
      alert: MetricAlert;
    }>(`/api/metrics/alerts/${alertId}/acknowledge`, {});
  },

  async updateMetric(
    metricId: string,
    data: Partial<{
      name: string;
      description: string;
      formula_config: Record<string, any>;
      display_format: string;
      threshold_alert: number;
      is_favorite: boolean;
    }>
  ): Promise<{
    success: boolean;
    metric: CustomMetric;
  }> {
    return api.patch(`/api/metrics/${metricId}`, data);
  },

  async deleteMetric(metricId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return api.delete(`/api/metrics/${metricId}`);
  },
};
