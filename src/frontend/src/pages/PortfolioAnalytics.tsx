import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: number;
  unit?: string;
}

export function PortfolioAnalytics() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Mock analytics data
    setMetrics([
      { label: 'Total Portfolio Value', value: '$1,350,000', change: 12.5, unit: '%' },
      { label: 'Year-to-Date ROI', value: '12.5%', change: 2.3, unit: '%' },
      { label: 'Annualized Returns', value: '8.7%', change: 1.2, unit: '%' },
      { label: 'Monthly Cash Flow', value: '$4,250', change: 5.1, unit: '$' },
    ]);
  }, [isAuthenticated, navigate]);

  const getChangeColor = (change: number): string => {
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Portfolio Analytics</h1>
          <p className="text-gray-600">Advanced performance tracking and insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600 mb-1">{metric.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</p>
              <p className={`text-sm font-semibold ${getChangeColor(metric.change)}`}>
                {metric.change > 0 ? '↑' : '↓'} {Math.abs(metric.change)}{metric.unit || '%'}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* ROI Over Time Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">ROI Trend (12 Months)</h2>
            <div className="h-64 flex items-end justify-around gap-1">
              {[3.2, 4.1, 3.8, 5.2, 6.1, 7.3, 8.1, 8.7, 9.2, 8.9, 9.5, 10.2].map(
                (value, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-blue-500 rounded-t"
                    style={{ height: `${(value / 10.2) * 100}%` }}
                    title={`${value}%`}
                  ></div>
                )
              )}
            </div>
            <div className="mt-4 text-xs text-gray-600 text-center">
              Jan • Feb • Mar • Apr • May • Jun • Jul • Aug • Sep • Oct • Nov • Dec
            </div>
          </div>

          {/* Asset Allocation Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Asset Allocation</h2>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Pie chart placeholder */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="#3B82F6" />
                  <circle cx="50" cy="50" r="35" fill="white" />
                  <circle cx="50" cy="50" r="30" fill="#3B82F6" stroke="white" strokeWidth="1" />
                  <circle cx="50" cy="50" r="25" fill="white" />
                  <circle cx="50" cy="50" r="20" fill="#10B981" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">$1.35M</p>
                    <p className="text-xs text-gray-600">Total Value</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Residential (60%)</span>
                <div className="w-32 h-2 bg-blue-500 rounded"></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Commercial (25%)</span>
                <div className="w-32 h-2 bg-green-500 rounded" style={{ width: '82px' }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Land (15%)</span>
                <div className="w-32 h-2 bg-yellow-500 rounded" style={{ width: '50px' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Property Performance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Property Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Acquired</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Cost Basis</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Value</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Gain/Loss</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">ROI</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: '456 Main St, Denver',
                    acquired: 'Jan 2022',
                    cost: '$400k',
                    value: '$475k',
                    gain: '$75k',
                    roi: '18.8%',
                  },
                  {
                    name: '789 Oak Ave, Denver',
                    acquired: 'Mar 2022',
                    cost: '$350k',
                    value: '$405k',
                    gain: '$55k',
                    roi: '15.7%',
                  },
                  {
                    name: '321 Pine Rd, Boulder',
                    acquired: 'Jun 2022',
                    cost: '$500k',
                    value: '$525k',
                    gain: '$25k',
                    roi: '5.0%',
                  },
                ].map((prop, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{prop.name}</td>
                    <td className="text-right py-3 px-4 text-gray-600">{prop.acquired}</td>
                    <td className="text-right py-3 px-4 text-gray-600">{prop.cost}</td>
                    <td className="text-right py-3 px-4 text-gray-900 font-medium">
                      {prop.value}
                    </td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">
                      +{prop.gain}
                    </td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">
                      {prop.roi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Risk */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Market Risk Profile</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Risk Score</span>
                  <span className="text-sm font-bold text-yellow-600">42/100</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '42%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Concentration Risk</span>
                  <span className="text-sm font-bold text-yellow-600">35/100</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: '35%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Market Volatility</span>
                  <span className="text-sm font-bold text-blue-600">28/100</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '28%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Diversification */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Diversification Score</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Geographic Spread</span>
                  <span className="text-sm font-bold text-green-600">78/100</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '78%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Property Type Variety</span>
                  <span className="text-sm font-bold text-green-600">65/100</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Investment Type Balance</span>
                  <span className="text-sm font-bold text-blue-600">52/100</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '52%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
