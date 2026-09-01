// Mock data fixtures for backend API tests

export const mockPortfolio = {
  id: 'portfolio_1',
  userId: 'user_1',
  name: 'Primary Investment Portfolio',
  description: 'Main portfolio for real estate investments',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockProperty = {
  id: 'property_1',
  portfolioId: 'portfolio_1',
  address: '456 Main Street',
  city: 'Denver',
  state: 'CO',
  zipCode: '80202',
  country: 'USA',
  propertyType: 'residential',
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 2200,
  yearBuilt: 2015,
  acquisitionDate: new Date('2022-03-15'),
  acquisitionPrice: 450000,
  currentValue: 520000,
  annualRentIncome: 30000,
  annualExpenses: 9000,
  loanBalance: 360000,
  interestRate: 6.5,
  loanTermMonths: 360,
  monthlyPayment: 2280,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockEmailSchedule = {
  id: 'schedule_1',
  portfolioId: 'portfolio_1',
  userId: 'user_1',
  frequency: 'weekly' as const,
  dayOfWeek: 'monday',
  dayOfMonth: null,
  timeOfDay: '09:00',
  reportType: 'summary' as const,
  recipients: ['user@example.com'],
  isActive: true,
  retryCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

export const mockCustomMetric = {
  id: 'metric_1',
  userId: 'user_1',
  portfolioId: 'portfolio_1',
  name: 'Debt Service Coverage Ratio',
  description: 'NOI divided by annual debt payment',
  formulaType: 'ratio' as const,
  formulaConfig: {
    numeratorField: 'totalNetIncome',
    denominatorField: 'totalDebtPayment',
  },
  displayFormat: 'number' as const,
  thresholdAlert: 1.25,
  isFavorite: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockMetricAlert = {
  id: 'alert_1',
  metricId: 'metric_1',
  userId: 'user_1',
  thresholdValue: 1.25,
  currentValue: 1.1,
  breachDirection: 'below' as const,
  isActive: true,
  acknowledgedAt: null,
  createdAt: new Date(),
};

export const mockEmailDeliveryLog = {
  id: 'log_1',
  scheduleId: 'schedule_1',
  messageId: 'msg_123',
  recipientEmail: 'user@example.com',
  subject: 'Weekly Portfolio Report',
  status: 'sent' as const,
  errorMessage: null,
  sentAt: new Date(),
  openedAt: null,
  attemptCount: 1,
  createdAt: new Date(),
};

export const mockPortfolioSnapshot = {
  portfolioId: 'portfolio_1',
  totalProperties: 1,
  totalInvestedCapital: 450000,
  totalCurrentValue: 520000,
  totalGain: 70000,
  gainPercentage: 15.56,
  totalAnnualRentIncome: 30000,
  totalAnnualExpenses: 9000,
  totalAnnualNetIncome: 21000,
  totalMonthlyIncome: 2500,
  totalMonthlyExpenses: 750,
  totalMonthlyNetIncome: 1750,
  totalDebtBalance: 360000,
  totalEquity: 160000,
  avgCapRate: 4.04,
  totalROI: 15.56,
  ytdROI: 12.5,
  annualizedReturns: 15.56,
  calculatedAt: new Date(),
};

export const mockPortfolioHealth = {
  portfolioId: 'portfolio_1',
  score: 78,
  status: 'good' as const,
  recommendations: [
    'Consider diversifying with additional properties',
    'Monthly cash flow is near optimal level',
  ],
  assessedAt: new Date(),
};

export const mockCacheStats = {
  hits: 150,
  misses: 50,
  hitRate: 0.75,
  totalCached: 5,
  memoryUsed: 5242880,
  memoryPeak: 10485760,
  estimatedMemory: 5242880,
};

export const mockReportResponse = {
  success: true,
  report: {
    id: 'report_1',
    portfolioId: 'portfolio_1',
    reportType: 'summary' as const,
    status: 'generated',
    downloadUrl: '/api/reports/report_1/download',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fileSize: 250000,
    generatedAt: new Date(),
  },
};

export const mockSearchProperty = {
  id: 'prop_2',
  address: '789 Oak Avenue',
  city: 'Boulder',
  state: 'CO',
  zipCode: '80301',
  country: 'USA',
  propertyType: 'residential',
  bedrooms: 4,
  bathrooms: 3,
  squareFeet: 2800,
  yearBuilt: 2018,
  price: 650000,
  description: 'Beautiful modern home with excellent schools',
  imageUrl: 'https://example.com/property.jpg',
};

export const mockSearchResults = {
  results: [mockSearchProperty],
  total: 1,
  page: 1,
  limit: 20,
  hasMore: false,
};

export const mockFavorite = {
  id: 'fav_1',
  userId: 'user_1',
  propertyId: 'prop_2',
  notes: 'Great investment opportunity',
  addedAt: new Date(),
};

export const mockTransaction = {
  id: 'trans_1',
  portfolioPropertyId: 'portfolio_prop_1',
  userId: 'user_1',
  transactionType: 'income' as const,
  category: 'rent',
  amount: 2500,
  date: new Date(),
  description: 'Monthly rental payment',
  createdAt: new Date(),
};

export const mockCategoryTotals = {
  rent: { total: 30000, count: 12 },
  maintenance: { total: 3000, count: 8 },
  insurance: { total: 2400, count: 2 },
  mortgage: { total: 27360, count: 12 },
};

export const mockMetricHistory = [
  {
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    value: 3.8,
  },
  {
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    value: 3.9,
  },
  {
    date: new Date(),
    value: 4.04,
  },
];

export const mockPortfolioTrends = {
  propertyTrends: [
    {
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      value: 500000,
    },
    {
      date: new Date(),
      value: 520000,
    },
  ],
  equityTrends: [
    {
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      equity: 100000,
    },
    {
      date: new Date(),
      equity: 160000,
    },
  ],
};

export const mockAggregationByProperty = [
  {
    id: 'property_1',
    address: '456 Main Street',
    totalValue: 520000,
    totalEquity: 160000,
    annualCashFlow: 21000,
  },
];

export const mockAggregationByCity = [
  {
    city: 'Denver',
    state: 'CO',
    properties: 1,
    totalValue: 520000,
    totalEquity: 160000,
    annualCashFlow: 21000,
  },
];
