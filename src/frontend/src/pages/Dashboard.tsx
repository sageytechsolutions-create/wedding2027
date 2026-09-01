import { useEffect, useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { emailService } from '../services/emailService';
import { metricsService } from '../services/metricsService';

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { summary, fetchSummary, isLoading, error } = usePortfolioStore();
  const portfolioId = 'portfolio_default'; // TODO: Get from portfolio store or route
  const [health, setHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
      fetchAdditionalData();
    }
  }, [isAuthenticated, fetchSummary]);

  const fetchAdditionalData = async () => {
    setLoadingExtra(true);
    try {
      const [healthData, alertsData, schedulesData] = await Promise.all([
        reportService.getPortfolioHealth(portfolioId).catch(() => null),
        metricsService.getAlerts().catch(() => ({ alerts: [] })),
        emailService.getSchedules().catch(() => ({ schedules: [] })),
      ]);

      if (healthData?.health) setHealth(healthData.health);
      if (alertsData?.alerts) setAlerts(alertsData.alerts.slice(0, 3));
      if (schedulesData?.schedules) setSchedules(schedulesData.schedules);
    } catch (err) {
      console.error('Error fetching additional dashboard data:', err);
    } finally {
      setLoadingExtra(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Real-time portfolio overview and key metrics</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => navigate('/analytics')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            📊 View Analytics
          </button>
          <button
            onClick={() => navigate('/recommendations')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            🎯 Get Recommendations
          </button>
          <button
            onClick={() => navigate('/metrics')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            📈 Custom Metrics
          </button>
        </div>

        {summary ? (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-medium">Properties Owned</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.propertyCount}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-medium">Total Invested</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${summary.totalInvestedCapital.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-medium">Current Value</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${summary.totalCurrentValue.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-medium">Total Appreciation</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  ${summary.totalAppreciation.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-medium">ROI</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{summary.roi.toFixed(2)}%</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-sm font-medium">Annual Expenses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${summary.totalAnnualExpenses.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Health & Status Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Health */}
              {health && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Portfolio Health</h3>
                  <div className={`p-4 rounded-lg mb-4 ${getHealthColor(health.status)}`}>
                    <p className="font-bold text-lg">{health.score}/100</p>
                    <p className="text-sm font-semibold capitalize">{health.status}</p>
                  </div>
                  {health.recommendations.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Recommendations:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {health.recommendations.slice(0, 2).map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Active Alerts */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Active Alerts</h3>
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.map((alert: any) => (
                      <div key={alert.id} className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm font-semibold text-red-800">
                          {alert.breach_direction === 'above' ? '↑' : '↓'} Threshold Alert
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Current: {alert.current_value?.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No active alerts</p>
                )}
              </div>

              {/* Email Schedules */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Email Schedules</h3>
                {schedules.length > 0 ? (
                  <div className="space-y-2">
                    {schedules.slice(0, 3).map((schedule: any) => (
                      <div
                        key={schedule.id}
                        className={`p-3 rounded border ${
                          schedule.is_active
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900 capitalize">
                          {schedule.frequency} - {schedule.report_type}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {schedule.time_of_day} • {schedule.recipients?.length || 0} recipients
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No email schedules configured</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <p className="text-blue-800 text-lg">No properties in your portfolio yet.</p>
            <button
              onClick={() => navigate('/search')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔍 Find Properties
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
