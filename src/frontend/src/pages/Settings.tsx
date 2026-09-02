import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { emailService } from '../services/emailService';
import { reportService } from '../services/reportService';

export function Settings() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'integrations' | 'data'>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    portfolioName: 'My Investment Portfolio',
    preferredCurrency: 'USD',
    timeZone: 'America/Denver',
    displayDecimalPlaces: 2,
  });

  const [notifications, setNotifications] = useState({
    emailOnAlerts: true,
    emailOnSchedule: true,
    dailyDigest: false,
    weeklyReport: true,
    lowCashFlowAlert: true,
    highDebtRatioAlert: true,
  });

  const [cacheStats, setCacheStats] = useState<any>(null);
  const [emailConnected, setEmailConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchIntegrationStatus();
  }, [isAuthenticated, navigate]);

  const fetchIntegrationStatus = async () => {
    try {
      const cacheResponse = await reportService.getCacheStatus().catch(() => null);
      if (cacheResponse?.cache_stats) {
        setCacheStats(cacheResponse.cache_stats);
      }

      const emailResponse = await emailService.verifyConnection().catch(() => null);
      if (emailResponse) {
        setEmailConnected(emailResponse.email_service === 'connected');
      }
    } catch (err) {
      console.error('Error fetching integration status:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate saving settings - in production, call API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate saving notifications - in production, call API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess('Notification preferences saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached reports? This cannot be undone.')) return;

    setLoading(true);
    try {
      await reportService.clearCache();
      setSuccess('Cache cleared successfully');
      fetchIntegrationStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Create CSV export of portfolio data
      const data = 'Portfolio Export\nGenerated: ' + new Date().toISOString();
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess('Data exported successfully');
    } catch (err) {
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your portfolio preferences and integrations</p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{user?.email || 'Not loaded'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
              <p className="text-gray-900">{new Date().getFullYear()}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b border-gray-200">
            {['general', 'notifications', 'integrations', 'data'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-6 py-4 font-medium text-center transition ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={settings.portfolioName}
                  onChange={(e) => setSettings({ ...settings, portfolioName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Preferred Currency
                  </label>
                  <select
                    value={settings.preferredCurrency}
                    onChange={(e) => setSettings({ ...settings, preferredCurrency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Time Zone
                  </label>
                  <select
                    value={settings.timeZone}
                    onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Decimal Places for Numbers
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={settings.displayDecimalPlaces}
                  onChange={(e) =>
                    setSettings({ ...settings, displayDecimalPlaces: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotifications} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="emailOnAlerts"
                    checked={notifications.emailOnAlerts}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailOnAlerts: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="emailOnAlerts" className="text-gray-900 font-medium cursor-pointer">
                    Email me on alert thresholds
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="emailOnSchedule"
                    checked={notifications.emailOnSchedule}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailOnSchedule: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="emailOnSchedule" className="text-gray-900 font-medium cursor-pointer">
                    Email me on scheduled reports
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="dailyDigest"
                    checked={notifications.dailyDigest}
                    onChange={(e) =>
                      setNotifications({ ...notifications, dailyDigest: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="dailyDigest" className="text-gray-900 font-medium cursor-pointer">
                    Send daily digest
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="weeklyReport"
                    checked={notifications.weeklyReport}
                    onChange={(e) =>
                      setNotifications({ ...notifications, weeklyReport: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="weeklyReport" className="text-gray-900 font-medium cursor-pointer">
                    Send weekly performance report
                  </label>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Alert Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="lowCashFlowAlert"
                      checked={notifications.lowCashFlowAlert}
                      onChange={(e) =>
                        setNotifications({ ...notifications, lowCashFlowAlert: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="lowCashFlowAlert" className="text-gray-900 font-medium cursor-pointer">
                      Low cash flow warning
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="highDebtRatioAlert"
                      checked={notifications.highDebtRatioAlert}
                      onChange={(e) =>
                        setNotifications({ ...notifications, highDebtRatioAlert: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="highDebtRatioAlert" className="text-gray-900 font-medium cursor-pointer">
                      High debt-to-value ratio alert
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Email Service</h4>
                    <p className="text-sm text-gray-600 mt-1">Send scheduled reports via email</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    emailConnected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {emailConnected ? '✓ Connected' : '✗ Disconnected'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Report Caching</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {cacheStats
                        ? `${cacheStats.hits} hits, ${cacheStats.misses} misses (${(cacheStats.hitRate * 100).toFixed(0)}% hit rate)`
                        : 'Loading...'}
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  All integrations are configured and ready to use. Check the Analytics page to generate reports.
                </p>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Data Management</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Export your portfolio data for backup or analysis in external tools.
                </p>

                <button
                  onClick={handleExportData}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Exporting...' : '📥 Export Portfolio Data'}
                </button>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 text-red-600">Danger Zone</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium mb-4">
                    Deleting your account will permanently remove all portfolio data. This action cannot be undone.
                  </p>
                  <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
