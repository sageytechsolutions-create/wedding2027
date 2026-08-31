import { create } from 'zustand';

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  formulaType: 'sum' | 'average' | 'ratio' | 'formula';
  field?: string;
  numeratorField?: string;
  denominatorField?: string;
  formula?: string;
  displayFormat: 'percentage' | 'currency' | 'number';
  thresholdAlert?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MetricsState {
  metrics: CustomMetric[];
  selectedMetricId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  addMetric: (metric: Omit<CustomMetric, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMetric: (id: string, updates: Partial<CustomMetric>) => void;
  deleteMetric: (id: string) => void;
  selectMetric: (id: string | null) => void;
  getMetricById: (id: string) => CustomMetric | undefined;
  calculateMetricValue: (metric: CustomMetric, data: Record<string, number>) => number | null;
  getMetrics: () => CustomMetric[];
  clearMetrics: () => void;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: [
    {
      id: 'metric_1',
      name: 'Cash-on-Cash Return',
      description: 'Annual Cash Flow divided by invested capital',
      formulaType: 'ratio',
      numeratorField: 'annualCashFlow',
      denominatorField: 'investedCapital',
      displayFormat: 'percentage',
      thresholdAlert: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'metric_2',
      name: 'Debt Service Coverage Ratio',
      description: 'Net Operating Income divided by Annual Debt Payment',
      formulaType: 'ratio',
      numeratorField: 'noi',
      denominatorField: 'annualDebtPayment',
      displayFormat: 'number',
      thresholdAlert: 1.25,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  selectedMetricId: null,
  loading: false,
  error: null,

  addMetric: (metric) =>
    set((state) => ({
      metrics: [
        ...state.metrics,
        {
          ...metric,
          id: `metric_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })),

  updateMetric: (id, updates) =>
    set((state) => ({
      metrics: state.metrics.map((m) =>
        m.id === id
          ? {
              ...m,
              ...updates,
              updatedAt: new Date(),
            }
          : m
      ),
    })),

  deleteMetric: (id) =>
    set((state) => ({
      metrics: state.metrics.filter((m) => m.id !== id),
      selectedMetricId: state.selectedMetricId === id ? null : state.selectedMetricId,
    })),

  selectMetric: (id) =>
    set(() => ({
      selectedMetricId: id,
    })),

  getMetricById: (id) => {
    const { metrics } = get();
    return metrics.find((m) => m.id === id);
  },

  calculateMetricValue: (metric, data) => {
    try {
      switch (metric.formulaType) {
        case 'sum':
          if (metric.field && metric.field in data) {
            return data[metric.field];
          }
          return null;

        case 'average':
          if (metric.field && metric.field in data) {
            return data[metric.field];
          }
          return null;

        case 'ratio':
          if (
            metric.numeratorField &&
            metric.denominatorField &&
            metric.numeratorField in data &&
            metric.denominatorField in data
          ) {
            const denominator = data[metric.denominatorField];
            if (denominator === 0) return null;
            return data[metric.numeratorField] / denominator;
          }
          return null;

        case 'formula':
          if (metric.formula) {
            let expression = metric.formula;
            Object.entries(data).forEach(([key, value]) => {
              expression = expression.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
            });

            try {
              const result = Function('"use strict"; return (' + expression + ')')();
              return typeof result === 'number' ? result : null;
            } catch {
              return null;
            }
          }
          return null;

        default:
          return null;
      }
    } catch {
      return null;
    }
  },

  getMetrics: () => {
    const { metrics } = get();
    return metrics;
  },

  clearMetrics: () =>
    set(() => ({
      metrics: [],
      selectedMetricId: null,
    })),
}));
