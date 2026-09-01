export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export const chartColors = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#8b5cf6',
  gray: '#6b7280',
};

export const chartPalette = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
];

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const generateROITrendData = (months: number = 12): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    const baseROI = 8 + Math.random() * 4;
    const variance = Math.sin(i / 3) * 2;

    data.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      roi: parseFloat((baseROI + variance + Math.random() * 1).toFixed(2)),
      date: date,
    });
  }

  return data;
};

export const generateAssetAllocationData = (properties: any[]): ChartDataPoint[] => {
  const allocation: { [key: string]: number } = {};

  properties.forEach((prop) => {
    const city = prop.city || 'Other';
    allocation[city] = (allocation[city] || 0) + prop.currentValue;
  });

  return Object.entries(allocation).map(([city, value]) => ({
    name: city,
    value: parseFloat(value.toFixed(0)),
  }));
};

export const generatePropertyPerformanceData = (properties: any[]): ChartDataPoint[] => {
  return properties.map((prop) => ({
    address: prop.address,
    roi: parseFloat(prop.roi.toFixed(2)),
    appreciation: parseFloat((Math.random() * 15).toFixed(2)),
    cashflow: parseFloat((prop.annualRent - prop.annualExpenses).toFixed(0)),
  }));
};

export const generateRiskData = (riskScores: {
  market: number;
  property: number;
  financial: number;
  tenant: number;
  economic: number;
}): ChartDataPoint[] => {
  return [
    { category: 'Market Risk', value: riskScores.market, fullMark: 100 },
    { category: 'Property Risk', value: riskScores.property, fullMark: 100 },
    { category: 'Financial Risk', value: riskScores.financial, fullMark: 100 },
    { category: 'Tenant Risk', value: riskScores.tenant, fullMark: 100 },
    { category: 'Economic Risk', value: riskScores.economic, fullMark: 100 },
  ];
};

export const getMetricColor = (value: number, max: number = 100): string => {
  const percentage = (value / max) * 100;
  if (percentage >= 80) return chartColors.success;
  if (percentage >= 60) return chartColors.primary;
  if (percentage >= 40) return chartColors.warning;
  return chartColors.danger;
};

export const getRiskColor = (score: number): string => {
  if (score <= 30) return chartColors.success;
  if (score <= 60) return chartColors.warning;
  return chartColors.danger;
};

export const getTemperatureColor = (temperature: 'Hot' | 'Warm' | 'Cool' | 'Cold'): string => {
  switch (temperature) {
    case 'Hot':
      return '#ef4444';
    case 'Warm':
      return '#f59e0b';
    case 'Cool':
      return '#3b82f6';
    case 'Cold':
      return '#06b6d4';
    default:
      return '#6b7280';
  }
};

export interface TooltipFormatter {
  value: number;
  type?: 'currency' | 'percentage' | 'number';
}

export const formatTooltip = (value: number, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
    default:
      return formatNumber(value);
  }
};

export const customizeChartLabel = (entry: any): string => {
  if (entry.value) {
    return `${entry.name}: ${formatCurrency(entry.value)}`;
  }
  return entry.name;
};

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    fill?: string;
  }>;
  label?: string;
}

export const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.fill }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const exportChartAsImage = async (chartRef: HTMLDivElement, filename: string = 'chart.png'): Promise<void> => {
  const canvas = await (window as any).html2canvas(chartRef);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateMonthlyProjection = (baseCashFlow: number, months: number = 12): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);

    const seasonalFactor = 0.95 + 0.1 * Math.sin((i / 12) * Math.PI * 2);
    const projectedCashFlow = baseCashFlow * seasonalFactor;

    data.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      projection: parseFloat(projectedCashFlow.toFixed(0)),
      date: date,
    });
  }

  return data;
};

export const calculateMetricsFromData = (properties: any[]): {
  totalValue: number;
  totalRentIncome: number;
  totalExpenses: number;
  avgROI: number;
  avgCapRate: number;
} => {
  const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalRentIncome = properties.reduce((sum, p) => sum + p.annualRent, 0);
  const totalExpenses = properties.reduce((sum, p) => sum + p.annualExpenses, 0);
  const avgROI = properties.reduce((sum, p) => sum + p.roi, 0) / properties.length;
  const avgCapRate = properties.reduce((sum, p) => sum + ((p.annualRent - p.annualExpenses) / p.currentValue) * 100, 0) / properties.length;

  return {
    totalValue: parseFloat(totalValue.toFixed(0)),
    totalRentIncome: parseFloat(totalRentIncome.toFixed(0)),
    totalExpenses: parseFloat(totalExpenses.toFixed(0)),
    avgROI: parseFloat(avgROI.toFixed(2)),
    avgCapRate: parseFloat(avgCapRate.toFixed(2)),
  };
};

export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
};
