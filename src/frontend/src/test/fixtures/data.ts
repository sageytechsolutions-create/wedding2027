export const mockPortfolioSnapshot = {
  portfolioId: 'portfolio_1',
  userId: 'user_1',
  metrics: {
    totalValue: 1350000,
    totalCostBasis: 1100000,
    totalGain: 250000,
    gainPercentage: 22.73,
    ytdROI: 20.46,
    annualizedReturns: 19.31,
    monthlyCashFlow: 5083,
    annualCashFlow: 61000,
    avgCapRate: 3.62,
    avgROI: 13.64,
    propertiesCount: 3,
    marketValue: 1350000,
    loanBalance: 1200000,
    equity: 150000,
  },
  properties: [
    {
      id: 'prop_1',
      address: '456 Main St',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      acquisitionDate: new Date('2022-03-15'),
      acquisitionPrice: 450000,
      currentValue: 520000,
      gain: 70000,
      gainPercentage: 15.56,
      roi: 15.56,
      annualRentIncome: 30000,
      annualExpenses: 9000,
      annualNetIncome: 21000,
      capRate: 4.04,
      loanBalance: 360000,
      interestRate: 6.5,
      monthlyPayment: 2280,
    },
  ],
  generatedAt: new Date(),
};

export const mockPortfolioHealth = {
  score: 78,
  status: 'good' as const,
  recommendations: [
    'Consider diversifying with additional properties',
    'Monthly cash flow is near optimal level',
  ],
};

export const mockEmailSchedule = {
  id: 'schedule_1',
  portfolio_id: 'portfolio_1',
  user_id: 'user_1',
  frequency: 'weekly' as const,
  day_of_week: 'monday',
  time_of_day: '09:00',
  report_type: 'summary' as const,
  recipients: ['user@example.com'],
  is_active: true,
  retry_count: 0,
  created_at: new Date(),
  updated_at: new Date(),
  next_run: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

export const mockMetric = {
  id: 'metric_1',
  user_id: 'user_1',
  name: 'Debt Service Coverage Ratio',
  description: 'NOI divided by annual debt payment',
  formula_type: 'ratio' as const,
  formula_config: {
    numeratorField: 'totalNetIncome',
    denominatorField: 'totalDebtPayment',
  },
  display_format: 'number' as const,
  is_favorite: false,
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockMetricAlert = {
  id: 'alert_1',
  metric_id: 'metric_1',
  user_id: 'user_1',
  threshold_value: 1.25,
  current_value: 1.1,
  breach_direction: 'below' as const,
  is_active: true,
  created_at: new Date(),
};

export const mockCacheStats = {
  hits: 150,
  misses: 50,
  hitRate: 0.75,
  totalCached: 5,
};

export const mockReportResponse = {
  success: true,
  report: {
    id: 'report_1',
    portfolio_id: 'portfolio_1',
    report_type: 'summary' as const,
    status: 'generated',
    download_url: '/api/reports/report_1/download',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    file_size: 250000,
    generated_at: new Date(),
  },
};

export const mockAvailableMetrics = [
  {
    id: 'metric_dscr',
    name: 'Debt Service Coverage Ratio',
    description: 'NOI divided by annual debt payment',
    formula_type: 'ratio',
    display_format: 'number',
    category: 'financial',
  },
  {
    id: 'metric_roi',
    name: 'Return on Investment',
    description: 'Total gain divided by total investment',
    formula_type: 'ratio',
    display_format: 'percentage',
    category: 'returns',
  },
  {
    id: 'metric_cap',
    name: 'Capitalization Rate',
    description: 'Net operating income divided by property value',
    formula_type: 'ratio',
    display_format: 'percentage',
    category: 'valuation',
  },
];

export const mockCustomMetric = {
  id: 'metric_custom_1',
  user_id: 'user_1',
  portfolio_id: 'portfolio_1',
  name: 'Custom ROI',
  description: 'Custom return calculation',
  formula_type: 'ratio' as const,
  formula_config: {
    numeratorField: 'totalGain',
    denominatorField: 'totalCostBasis',
  },
  display_format: 'percentage' as const,
  threshold_alert: 15,
  is_favorite: true,
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockMetricCalculation = {
  id: 'calc_1',
  metric_id: 'metric_1',
  calculated_value: 22.5,
  portfolio_snapshot: {
    totalValue: 1350000,
    totalGain: 250000,
  },
  calculation_time: 145,
  alert_triggered: false,
  created_at: new Date(),
};

export const mockMetricAlertWithThreshold = {
  id: 'alert_1',
  metric_id: 'metric_1',
  user_id: 'user_1',
  threshold_value: 15,
  current_value: 12.5,
  breach_direction: 'below' as const,
  is_active: true,
  created_at: new Date(),
};

export const mockValidationResult = {
  valid: true,
  message: 'Formula is valid',
};

export const mockQueueStatus = {
  active: 2,
  delayed: 1,
  failed: 0,
  completed: 150,
  waiting: 5,
};
