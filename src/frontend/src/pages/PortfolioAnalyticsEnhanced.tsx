import { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { ReportGenerator, PortfolioData as ReportPortfolioData } from '../utils/reportGenerator';
import { EmailScheduleModal } from '../components/EmailScheduleModal';
import {
  generateROITrendData, generateAssetAllocationData, generatePropertyPerformanceData,
  generateRiskData, chartColors, chartPalette, formatCurrency, getMetricColor,
} from '../utils/chartHelpers';

interface PropertyData {
  id: string;
  address: string;
  city: string;
  acquisitionDate: string;
  costBasis: number;
  currentValue: number;
  gain: number;
  roi: number;
  annualRent: number;
  annualExpenses: number;
}

const mockProperties: PropertyData[] = [
  {
    id: 'prop_1',
    address: '456 Main St',
    city: 'Denver',
    acquisitionDate: '2022-03-15',
    costBasis: 450000,
    currentValue: 520000,
    gain: 70000,
    roi: 15.6,
    annualRent: 30000,
    annualExpenses: 9000,
  },
  {
    id: 'prop_2',
    address: '789 Oak Ave',
    city: 'Denver',
    acquisitionDate: '2021-06-20',
    costBasis: 425000,
    currentValue: 495000,
    gain: 70000,
    roi: 16.5,
    annualRent: 25000,
    annualExpenses: 8000,
  },
  {
    id: 'prop_3',
    address: '321 Pine Rd',
    city: 'Boulder',
    acquisitionDate: '2023-01-10',
    costBasis: 625000,
    currentValue: 680000,
    gain: 55000,
    roi: 8.8,
    annualRent: 35000,
    annualExpenses: 12000,
  },
];

export function PortfolioAnalyticsEnhanced() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '12m' | 'ytd' | 'all'>('12m');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [exporting, setExporting] = useState(false);
  const portfolioId = 'portfolio_default'; // TODO: Get from route params or portfolio store

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const totalValue = mockProperties.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCostBasis = mockProperties.reduce((sum, p) => sum + p.costBasis, 0);
  const totalGain = totalValue - totalCostBasis;
  const ytdROI = ((totalGain / totalCostBasis) * 100 * 0.9).toFixed(2);
  const annualizedReturns = ((totalGain / totalCostBasis) * 100 * 0.85).toFixed(2);
  const monthlyCashFlow = mockProperties.reduce((sum, p) => sum + (p.annualRent - p.annualExpenses) / 12, 0);

  const roiData = generateROITrendData(12);
  const assetData = generateAssetAllocationData(mockProperties);
  const propertyPerformanceData = generatePropertyPerformanceData(mockProperties);
  const riskData = generateRiskData({
    market: 35,
    property: 28,
    financial: 42,
    tenant: 22,
    economic: 30,
  });

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await reportService.generateReport(portfolioId, 'full');

      if (response.success && response.report.download_url) {
        const blob = await reportService.downloadReport(response.report.id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `portfolio_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    } finally {
      setExporting(false);
    }
  };

  const handleEmailSchedule = (config: any) => {
    console.log('Email schedule created:', config);
    alert('Report schedule created successfully! Check your email for confirmation.');
  };

  const MetricCard = ({ label, value, change }: { label: string; value: string; change?: number }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {change !== undefined && (
        <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Portfolio Analytics</h1>
          <p className="text-gray-600">Advanced analytics and performance metrics for your real estate portfolio</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {exporting ? '⏳ Generating...' : '📥 Export as PDF'}
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            ✉️ Schedule Email
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard label="Total Portfolio Value" value={formatCurrency(totalValue)} change={8.5} />
          <MetricCard label="Year-to-Date ROI" value={`${ytdROI}%`} change={12.3} />
          <MetricCard label="Annualized Returns" value={`${annualizedReturns}%`} change={-2.1} />
          <MetricCard label="Monthly Cash Flow" value={formatCurrency(monthlyCashFlow)} change={5.2} />
        </div>

        {/* Chart Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="12m">Last 12 Months</option>
                <option value="ytd">Year to Date</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ROI Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">ROI Trend (12 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value.toFixed(2)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke={chartColors.primary}
                  dot={{ fill: chartColors.primary }}
                  strokeWidth={2}
                  name="ROI %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Allocation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Asset Allocation by Location</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / totalValue) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Property Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Property Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="address" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="roi" fill={chartColors.success} name="ROI %" />
                <Bar dataKey="appreciation" fill={chartColors.primary} name="Appreciation %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={riskData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Risk Score"
                  dataKey="value"
                  stroke={chartColors.danger}
                  fill={chartColors.danger}
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Property Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Property Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Property</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Cost Basis</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Current Value</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Gain/Loss</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">ROI</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Annual Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {mockProperties.map((property) => (
                  <tr key={property.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{property.address}</p>
                        <p className="text-sm text-gray-600">{property.city}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(property.costBasis)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(property.currentValue)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${property.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(property.gain)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-blue-600">{property.roi.toFixed(2)}%</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      {formatCurrency((property.annualRent - property.annualExpenses) / 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk & Diversification Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Risk Assessment</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Risk Score</p>
                <p className="text-3xl font-bold text-gray-900">32<span className="text-lg">/100</span></p>
                <p className="text-sm text-green-600 mt-1">Low Risk</p>
              </div>
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Market Risk</span>
                  <span className="font-medium">35/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Property Risk</span>
                  <span className="font-medium">28/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Financial Risk</span>
                  <span className="font-medium">42/100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Diversification</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Geographic Spread</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <p className="text-sm text-gray-900 mt-1 font-medium">78/100</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Property Type Variety</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-sm text-gray-900 mt-1 font-medium">65/100</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Investment Balance</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '52%' }}></div>
                </div>
                <p className="text-sm text-gray-900 mt-1 font-medium">52/100</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-gray-900">1.45</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-600">-8.2%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Return/Risk Ratio</p>
                <p className="text-2xl font-bold text-green-600">2.1x</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Schedule Modal */}
      <EmailScheduleModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        portfolioId={portfolioId}
        onSchedule={handleEmailSchedule}
        portfolioName="Investment Portfolio"
      />
    </div>
  );
}
